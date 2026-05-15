import { type ModelMessage, generateText, streamText } from "ai";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../lib/db/index.js";
import {
  aiChatSessions,
  aiConversationEvents,
  aiMessages,
  aiUsageLogs,
  boards,
  chapterSubparts,
  chapters,
  exercises,
  subjects
} from "../lib/db/schema.js";
import { buildProactiveHint, detectConfusionPattern, getConfusionTopicLabel } from "../lib/ai-confusion.js";
import { env } from "../lib/env.js";
import { consumeAiChatRateLimit, moderateAiInput } from "../lib/ai-guardrails.js";
import { extractConversationConcepts } from "../lib/ai-concept-extractor.js";
import { logger } from "../lib/logger.js";
import { startSpan, endSpan } from "../lib/performance.js";
import {
  buildTutorSystemPrompt,
  inferFailedAttempts,
  MISTRAL_COMPLETION_MAX_TOKENS,
  getMistralModel,
  getMistralModelId,
  MISTRAL_TEMPERATURE,
  type ChatMessage,
  type TutorMode,
  type TutorChapterContext,
  type TutorPersonalContext
} from "../lib/mistral.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { learningPathService } from "../services/learning-path.service.js";
import { progressService } from "../services/progress.service.js";
import { createAiModelStrategy } from "../services/ai-model-strategy.js";
import { getCachedAiResponse, readAiCircuitState, setCachedAiResponse, writeAiCircuitState } from "../services/ai-model-strategy.store.js";

/** Max content length for user-authored messages (abuse prevention). */
const USER_MESSAGE_MAX_LENGTH = 4000;

/**
 * Max content length for assistant messages echoed back for context.
 * Must be generous: MISTRAL_COMPLETION_MAX_TOKENS (2 048 tokens) can
 * produce ~8 000 characters of English text plus markdown formatting.
 */
const ASSISTANT_MESSAGE_MAX_LENGTH = 16_000;

const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(USER_MESSAGE_MAX_LENGTH)
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH)
  })
]);

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  mode: z.enum(["explain", "socratic"]).default("explain"),
  chapterId: z.number().int().positive().optional(),
  sessionId: z.string().uuid().optional()
});

type ChapterContextPayload = {
  context: TutorChapterContext;
  chapterId: number;
};

type ExerciseQuestionRow = {
  question: string;
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);

const pickRelevantExerciseQuestion = (exerciseRows: ExerciseQuestionRow[], latestPrompt: string): string | undefined => {
  if (exerciseRows.length === 0) {
    return undefined;
  }

  const promptTokens = new Set(tokenize(latestPrompt));
  if (promptTokens.size === 0) {
    return exerciseRows[0]?.question;
  }

  let bestMatch: { question: string; score: number } | null = null;

  for (const row of exerciseRows) {
    const questionTokens = tokenize(row.question);
    const score = questionTokens.reduce((total, token) => (promptTokens.has(token) ? total + 1 : total), 0);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        question: row.question,
        score
      };
    }
  }

  return bestMatch?.question ?? exerciseRows[0]?.question;
};

const loadChapterContext = async (chapterId: number, latestPrompt: string): Promise<ChapterContextPayload | null> => {
  const chapterRows = await db
    .select({
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      chapterSummary: chapters.summary,
      grade: subjects.grade,
      subjectName: subjects.name,
      boardName: boards.name
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(chapters.id, chapterId))
    .limit(1);

  const chapterRow = chapterRows[0];
  if (!chapterRow) {
    return null;
  }

  let summary = chapterRow.chapterSummary ?? "";

  // Subparts are the canonical chapter content; always prefer them when present.
  const subpartRows = await db
    .select({
      heading: chapterSubparts.heading,
      content: chapterSubparts.content
    })
    .from(chapterSubparts)
    .where(eq(chapterSubparts.chapterId, chapterId))
    .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));

  if (subpartRows.length > 0) {
    // Limit context injection size to prevent token blowup and model context window limits
    summary = subpartRows
      .map((sp) => `# ${sp.heading}\n${sp.content}`)
      .join("\n\n")
      .slice(0, 12000);
  }

  const exerciseRows = await db
    .select({
      question: exercises.question
    })
    .from(exercises)
    .where(eq(exercises.chapterId, chapterId))
    .limit(50);

  const focusExerciseQuestion = pickRelevantExerciseQuestion(exerciseRows, latestPrompt);

  return {
    chapterId: chapterRow.chapterId,
    context: {
      board: chapterRow.boardName,
      grade: chapterRow.grade ?? "9",
      subject: chapterRow.subjectName,
      chapterTitle: chapterRow.chapterTitle,
      chapterSummary: summary.trim().length > 0 ? summary : "No chapter summary available for this chapter.",
      ...(focusExerciseQuestion ? { focusExerciseQuestion } : {})
    }
  };
};

const fallbackContext: TutorChapterContext = {
  board: "Punjab Board",
  grade: "9",
  subject: "General",
  chapterTitle: "Current topic",
  chapterSummary: "No chapter context was provided. Clarify the topic before teaching."
};

const truncateTitle = (value: string): string => {
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length <= 90) {
    return clean;
  }
  return `${clean.slice(0, 87)}...`;
};

const buildSessionTitle = (chapterContext: ChapterContextPayload | null, latestPrompt: string): string => {
  if (chapterContext) {
    return truncateTitle(`${chapterContext.context.subject}: ${chapterContext.context.chapterTitle}`);
  }
  return truncateTitle(latestPrompt);
};

const aiModelStrategy = createAiModelStrategy({
  readCircuitState: async () => readAiCircuitState(),
  writeCircuitState: async ({ state }) => writeAiCircuitState(state),
  getCachedResponse: async ({ normalizedPrompt }) => getCachedAiResponse(normalizedPrompt),
  setCachedResponse: async ({ normalizedPrompt, responseText }) => setCachedAiResponse(normalizedPrompt, responseText),
  invokeModel: async ({ tier, system, messages, maxOutputTokens, temperature }) => {
    const model = getMistralModel(tier);
    const modelId = getMistralModelId(tier);
    const result = await generateText({
      model,
      system,
      messages: messages as ModelMessage[],
      maxOutputTokens,
      temperature
    });

    return {
      text: result.text,
      model: modelId,
      modelTier: tier,
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0
    };
  },
  invokeModelStreaming: ({ tier, system, messages, maxOutputTokens, temperature }) => {
    const model = getMistralModel(tier);
    const modelId = getMistralModelId(tier);

    const result = streamText({
      model,
      system,
      messages: messages as ModelMessage[],
      maxOutputTokens,
      temperature
    });

    return {
      textStream: result.textStream,
      completed: (async () => {
        const [text, usage] = await Promise.all([result.text, result.usage]);
        return {
          text,
          model: modelId,
          modelTier: tier,
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0
        };
      })()
    };
  },
  sleep: async (delayMs) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
});

export const aiChatRouter = Router();

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid()
});

const proactiveHintHeaderSchema = z.object({
  topic: z.string(),
  message: z.string(),
  reasons: z.array(z.string())
});

aiChatRouter.get("/sessions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const sessionRows = await db
    .select({
      id: aiChatSessions.id,
      title: aiChatSessions.title,
      lastMessageAt: aiChatSessions.lastMessageAt
    })
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.userId, userId), isNull(aiChatSessions.chapterId)))
    .orderBy(desc(aiChatSessions.lastMessageAt), desc(aiChatSessions.createdAt));

  res.status(200).json({
    sessions: sessionRows
  });
});

aiChatRouter.get("/sessions/:sessionId/messages", requireSession, async (req, res) => {
  const parsedParams = sessionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid AI session ID."
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  const { sessionId } = parsedParams.data;

  const sessionRows = await db
    .select({
      id: aiChatSessions.id,
      title: aiChatSessions.title,
      lastMessageAt: aiChatSessions.lastMessageAt
    })
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userId), isNull(aiChatSessions.chapterId)))
    .limit(1);

  const sessionRow = sessionRows[0];
  if (!sessionRow) {
    res.status(404).json({
      error: "AI session not found."
    });
    return;
  }

  const messageRows = await db
    .select({
      id: aiMessages.id,
      role: aiMessages.role,
      content: aiMessages.content,
      createdAt: aiMessages.createdAt
    })
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionRow.id))
    .orderBy(asc(aiMessages.createdAt));

  const latestConfusionEventRows = await db
    .select({
      metadata: aiConversationEvents.metadata
    })
    .from(aiConversationEvents)
    .where(and(eq(aiConversationEvents.sessionId, sessionRow.id), eq(aiConversationEvents.eventType, "confusion_detected")))
    .orderBy(desc(aiConversationEvents.createdAt))
    .limit(1);

  const latestConfusionEvent = proactiveHintHeaderSchema.safeParse(latestConfusionEventRows[0]?.metadata);

  res.status(200).json({
    session: sessionRow,
    messages: messageRows,
    proactiveHint: latestConfusionEvent.success
      ? {
          topic: latestConfusionEvent.data.topic,
          message: latestConfusionEvent.data.message,
          reasons: latestConfusionEvent.data.reasons
        }
      : null
  });
});

aiChatRouter.post("/chat", requireSession, async (req, res) => {
  if (env.MISTRAL_API_KEY === "not-configured") {
    res.status(503).json({ error: "Mistral API key is not configured on the server." });
    return;
  }

  const parsed = chatInputSchema.safeParse(req.body);
  if (!parsed.success) {
    const flattenedErrors = parsed.error.flatten();
    console.warn("[ai-chat] validation failed:", JSON.stringify(flattenedErrors, null, 2));
    console.warn("[ai-chat] raw body keys:", Object.keys(req.body ?? {}));
    if (Array.isArray(req.body?.messages)) {
      console.warn("[ai-chat] message count:", req.body.messages.length);
      for (const [i, m] of req.body.messages.entries()) {
        if (typeof m.content === "string" && m.content.trim().length === 0) {
          console.warn(`[ai-chat] empty content at messages[${i}]:`, JSON.stringify(m));
        }
      }
    }
    res.status(400).json({
      error: "Invalid AI chat payload",
      details: flattenedErrors
    });
    return;
  }

  const { messages, chapterId, mode, sessionId } = parsed.data;
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    res.status(400).json({
      error: "At least one user message is required."
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const moderation = moderateAiInput(latestUserMessage.content);
  if (moderation.blocked) {
    res.status(422).json({
      error: "Message blocked by AI safety checks.",
      reason: moderation.reason
    });
    return;
  }

  let rateLimit: Awaited<ReturnType<typeof consumeAiChatRateLimit>>;
  try {
    rateLimit = await consumeAiChatRateLimit(userId);
  } catch (error) {
    logger.error({ error }, "AI rate limit check failed");
    res.status(503).json({
      error: "AI rate limiting is temporarily unavailable."
    });
    return;
  }

  res.setHeader("x-ratelimit-limit", String(rateLimit.limit));
  res.setHeader("x-ratelimit-remaining", String(rateLimit.remaining));
  res.setHeader("x-ratelimit-reset", String(rateLimit.resetSeconds));

  if (!rateLimit.allowed) {
    res.setHeader("retry-after", String(rateLimit.resetSeconds));
    res.status(429).json({
      error: "AI chat rate limit exceeded.",
      retryAfterSeconds: rateLimit.resetSeconds
    });
    return;
  }

  const chapterContext = chapterId ? await loadChapterContext(chapterId, latestUserMessage.content) : null;

  if (chapterId && !chapterContext) {
    res.status(404).json({
      error: "Chapter not found for AI context injection."
    });
    return;
  }

  const sessionRows = sessionId
    ? await db
        .select({
          id: aiChatSessions.id,
          chapterId: aiChatSessions.chapterId
        })
        .from(aiChatSessions)
        .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userId)))
        .limit(1)
    : [];

  if (sessionId && sessionRows.length === 0) {
    res.status(404).json({
      error: "AI session not found."
    });
    return;
  }

  const sessionRow =
    sessionRows[0] ??
    (
      await db
        .insert(aiChatSessions)
        .values({
          userId,
          chapterId: chapterContext?.chapterId ?? chapterId ?? null,
          title: buildSessionTitle(chapterContext, latestUserMessage.content)
        })
        .returning({
          id: aiChatSessions.id,
          chapterId: aiChatSessions.chapterId
        })
    )[0];

  if (!sessionRow) {
    res.status(500).json({
      error: "Unable to initialize AI chat session."
    });
    return;
  }

  const latestStoredMessage = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content
    })
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionRow.id))
    .orderBy(desc(aiMessages.createdAt))
    .limit(1);

  if (latestStoredMessage[0]?.role !== "user" || latestStoredMessage[0]?.content !== latestUserMessage.content) {
    await db.insert(aiMessages).values({
      sessionId: sessionRow.id,
      role: "user",
      content: latestUserMessage.content
    });
  }

  await db.update(aiChatSessions).set({ lastMessageAt: new Date() }).where(eq(aiChatSessions.id, sessionRow.id));

  const persistedMessageRows = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content
    })
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionRow.id))
    .orderBy(asc(aiMessages.createdAt));

  const confusionResult = detectConfusionPattern({
    messages: persistedMessageRows as ChatMessage[]
  });
  const proactiveHint = confusionResult.triggered
    ? {
        topic: getConfusionTopicLabel(chapterContext?.context ?? fallbackContext),
        message: buildProactiveHint(getConfusionTopicLabel(chapterContext?.context ?? fallbackContext)),
        reasons: confusionResult.reasons
      }
    : null;

  if (proactiveHint) {
    await db.insert(aiConversationEvents).values({
      sessionId: sessionRow.id,
      eventType: "confusion_detected",
      metadata: {
        topic: proactiveHint.topic,
        message: proactiveHint.message,
        reasons: proactiveHint.reasons,
        chapterId: chapterContext?.chapterId ?? sessionRow.chapterId ?? null
      }
    });
  }

  const failedAttempts = inferFailedAttempts(messages as ChatMessage[]);

  // Fetch personal AI context for the user (non-blocking on failure)
  let personalContext: TutorPersonalContext | undefined;
  try {
    const [aiCtx, learningPath, adaptiveWeakAreas] = await Promise.all([
      aiContextRepository.findByUserId(userId),
      learningPathService.getLearningPath(userId, {
        boardSlug: authedReq.session.user.board ?? null,
        classSlug: authedReq.session.user.class ?? null
      }),
      progressService.getAdaptiveWeakAreaLabels(userId, 5)
    ]);

    const mergedWeakAreas = Array.from(new Set([...adaptiveWeakAreas, ...learningPath.studentWeakAreas])).slice(0, 5);

    if (aiCtx) {
      personalContext = {
        weakTopics: aiCtx.weakTopics,
        strongTopics: aiCtx.strongTopics,
        studentWeakAreas: mergedWeakAreas,
        preferredExplanationStyle: aiCtx.preferredExplanationStyle,
        lastConceptsDiscussed: aiCtx.lastConceptsDiscussed
      };
    } else if (mergedWeakAreas.length > 0) {
      personalContext = {
        weakTopics: [],
        strongTopics: [],
        studentWeakAreas: mergedWeakAreas,
        preferredExplanationStyle: "balanced",
        lastConceptsDiscussed: []
      };
    }
  } catch (error) {
    logger.error({ error }, "Failed to fetch AI context for user");
  }

  const systemPrompt = buildTutorSystemPrompt({
    context: chapterContext?.context ?? fallbackContext,
    failedAttempts,
    mode: mode as TutorMode,
    ...(personalContext ? { personalContext } : {}),
  });

  const modelMessages: ModelMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  let providerError: string | null = null;
  const aiSpan = startSpan("ai.chat.generate", "ai.call");

  try {
    // Attempt streaming first
    const streamResult = await aiModelStrategy.generateStream({
      prompt: latestUserMessage.content,
      messages: modelMessages as ChatMessage[],
      system: systemPrompt,
      maxOutputTokens: MISTRAL_COMPLETION_MAX_TOKENS,
      temperature: MISTRAL_TEMPERATURE,
    });

    // Set streaming headers before piping
    res.status(200);
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.setHeader("transfer-encoding", "chunked");
    res.setHeader("cache-control", "no-cache");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-ai-session-id", sessionRow.id);
    if (proactiveHint) {
      res.setHeader("x-ai-proactive-hint", encodeURIComponent(JSON.stringify(proactiveHint)));
    }

    // Pipe text chunks to the response as they arrive
    let streamedText = "";
    for await (const chunk of streamResult.textStream) {
      streamedText += chunk;
      res.write(chunk);
    }
    res.end();

    // Wait for completion metadata (usage, model tier)
    const result = await streamResult.completed;
    const assistantText = result.text.trim().length > 0 ? result.text.trim() : streamedText.trim();

    if (assistantText.length > 0) {
      await db.insert(aiMessages).values({
        sessionId: sessionRow.id,
        role: "assistant",
        content: assistantText
      });
    }

    await db.insert(aiUsageLogs).values({
      userId,
      sessionId: sessionRow.id,
      modelTier: result.modelTier,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens
    });

    await db.update(aiChatSessions).set({ lastMessageAt: new Date() }).where(eq(aiChatSessions.id, sessionRow.id));

    if (assistantText.length > 0) {
      try {
        const extraction = extractConversationConcepts(latestUserMessage.content, assistantText);

        if (extraction.conceptsDiscussed.length > 0) {
          await aiContextRepository.updateLastConcepts(userId, extraction.conceptsDiscussed);
        }

        for (const weakTopic of extraction.weakTopicCandidates) {
          await aiContextRepository.addWeakTopic(userId, weakTopic);
        }

        if (extraction.hasStrongSignal && extraction.conceptsDiscussed.length > 0) {
          const ctx = await aiContextRepository.findByUserId(userId);
          if (ctx) {
            for (const concept of extraction.conceptsDiscussed) {
              const normalizedConcept = concept.trim().toLowerCase();
              if (ctx.weakTopics.includes(normalizedConcept)) {
                await aiContextRepository.removeWeakTopic(userId, normalizedConcept);
                await aiContextRepository.addStrongTopic(userId, normalizedConcept);
              }
            }
          }
        }
      } catch (error) {
        logger.error({ error }, "AI concept extraction failed (non-critical)");
      }
    }
  } catch (error) {
    logger.error({ error }, "AI streaming generation error");

    if (!res.headersSent) {
      // Headers not sent yet — fall back to non-streaming strategy with retries
      try {
        const fallbackResult = await aiModelStrategy.generate({
          prompt: latestUserMessage.content,
          messages: modelMessages as ChatMessage[],
          system: systemPrompt,
          maxOutputTokens: MISTRAL_COMPLETION_MAX_TOKENS,
          temperature: MISTRAL_TEMPERATURE,
        });

        const assistantText = fallbackResult.text.trim();
        if (assistantText.length > 0) {
          await db.insert(aiMessages).values({
            sessionId: sessionRow.id,
            role: "assistant",
            content: assistantText
          });
        }

        await db.insert(aiUsageLogs).values({
          userId,
          sessionId: sessionRow.id,
          modelTier: fallbackResult.modelTier,
          model: fallbackResult.model,
          promptTokens: fallbackResult.promptTokens,
          completionTokens: fallbackResult.completionTokens
        });

        await db.update(aiChatSessions).set({ lastMessageAt: new Date() }).where(eq(aiChatSessions.id, sessionRow.id));

        res.status(200);
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.setHeader("x-ai-session-id", sessionRow.id);
        res.setHeader("x-ai-model-tier", fallbackResult.modelTier);
        if (proactiveHint) {
          res.setHeader("x-ai-proactive-hint", encodeURIComponent(JSON.stringify(proactiveHint)));
        }
        res.write(assistantText);
        res.end();
      } catch (fallbackError) {
        logger.error({ error: fallbackError }, "AI fallback generation also failed");
        providerError = fallbackError instanceof Error ? fallbackError.message : "Unknown provider generation error.";
        res.status(502).json({
          error: providerError ?? "Failed to generate AI response from the provider.",
          sessionId: sessionRow.id
        });
      }
    } else {
      // Headers already sent (partial stream was delivered) — end the response
      logger.error({ error }, "AI stream failed mid-response after headers were sent");
      res.end();
    }
  } finally {
    endSpan(aiSpan);
  }
});
