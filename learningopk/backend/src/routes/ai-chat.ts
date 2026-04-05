import { streamText, type ModelMessage } from "ai";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../lib/db/index.js";
import { aiChatSessions, aiMessages, aiUsageLogs, boards, chapters, exercises, subjects } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { consumeAiChatRateLimit, moderateAiInput } from "../lib/ai-guardrails.js";
import { extractConversationConcepts } from "../lib/ai-concept-extractor.js";
import { logger } from "../lib/logger.js";
import { startSpan, endSpan } from "../lib/performance.js";
import {
  buildTutorSystemPrompt,
  inferFailedAttempts,
  MISTRAL_COMPLETION_MAX_TOKENS,
  MISTRAL_MODEL_ID,
  mistralModel,
  MISTRAL_TEMPERATURE,
  type ChatMessage,
  type TutorChapterContext,
  type TutorPersonalContext
} from "../lib/mistral.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { learningPathService } from "../services/learning-path.service.js";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
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
      chapterSummary: chapterRow.chapterSummary,
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

export const aiChatRouter = Router();

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid()
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

  res.status(200).json({
    session: sessionRow,
    messages: messageRows
  });
});

aiChatRouter.post("/chat", requireSession, async (req, res) => {
  if (env.MISTRAL_API_KEY === "not-configured") {
    res.status(503).json({ error: "Mistral API key is not configured on the server." });
    return;
  }

  const parsed = chatInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid AI chat payload",
      details: parsed.error.flatten()
    });
    return;
  }

  const { messages, chapterId, sessionId } = parsed.data;
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

  const failedAttempts = inferFailedAttempts(messages as ChatMessage[]);

  // Fetch personal AI context for the user (non-blocking on failure)
  let personalContext: TutorPersonalContext | undefined;
  try {
    const [aiCtx, learningPath] = await Promise.all([
      aiContextRepository.findByUserId(userId),
      learningPathService.getLearningPath(userId, {
        boardSlug: authedReq.session.user.board ?? null,
        classSlug: authedReq.session.user.class ?? null
      })
    ]);

    if (aiCtx) {
      personalContext = {
        weakTopics: aiCtx.weakTopics,
        strongTopics: aiCtx.strongTopics,
        studentWeakAreas: learningPath.studentWeakAreas.slice(0, 5),
        preferredExplanationStyle: aiCtx.preferredExplanationStyle,
        lastConceptsDiscussed: aiCtx.lastConceptsDiscussed
      };
    } else if (learningPath.studentWeakAreas.length > 0) {
      personalContext = {
        weakTopics: [],
        strongTopics: [],
        studentWeakAreas: learningPath.studentWeakAreas.slice(0, 5),
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
    ...(personalContext ? { personalContext } : {}),
  });

  const modelMessages: ModelMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  let providerStreamError: string | null = null;

  const aiSpan = startSpan("ai.chat.stream", "ai.call", { model: MISTRAL_MODEL_ID });

  const result = streamText({
    model: mistralModel,
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: MISTRAL_COMPLETION_MAX_TOKENS,
    temperature: MISTRAL_TEMPERATURE,
    onError: ({ error }) => {
      providerStreamError = error instanceof Error ? error.message : "Unknown provider streaming error.";
    },
    onFinish: async (event) => {
      const assistantText = event.text.trim();
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
        model: MISTRAL_MODEL_ID,
        promptTokens: event.totalUsage.inputTokens ?? 0,
        completionTokens: event.totalUsage.outputTokens ?? 0
      });

      await db.update(aiChatSessions).set({ lastMessageAt: new Date() }).where(eq(aiChatSessions.id, sessionRow.id));

      // Async concept extraction — don't block the response
      if (assistantText.length > 0) {
        try {
          const extraction = extractConversationConcepts(latestUserMessage.content, assistantText);

          // Update last discussed concepts
          if (extraction.conceptsDiscussed.length > 0) {
            await aiContextRepository.updateLastConcepts(userId, extraction.conceptsDiscussed);
          }

          // Add weak topic candidates
          for (const weakTopic of extraction.weakTopicCandidates) {
            await aiContextRepository.addWeakTopic(userId, weakTopic);
          }

          // If strong signal detected, move last discussed concepts from weak to strong
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
    }
  });

  let streamedAtLeastOneChunk = false;
  try {
    for await (const chunk of result.textStream) {
      if (!streamedAtLeastOneChunk) {
        res.status(200);
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.setHeader("x-ai-session-id", sessionRow.id);
      }
      streamedAtLeastOneChunk = true;
      res.write(chunk);
    }
  } catch (error) {
    logger.error({ error }, "AI provider streaming error");
    providerStreamError = error instanceof Error ? error.message : "Unknown provider streaming error.";
  } finally {
    endSpan(aiSpan);

    if (!streamedAtLeastOneChunk) {
      res.status(502).json({
        error: providerStreamError ?? "Failed to stream AI response from the provider.",
        sessionId: sessionRow.id
      });
      return;
    }

    if (!res.writableEnded) {
      res.end();
    }
  }
});
