import { type ModelMessage, generateText, streamText } from "ai";
import { z } from "zod";

import {
  buildProactiveHint,
  detectConfusionPattern,
  getConfusionTopicLabel,
} from "../lib/ai-confusion.js";
import { extractConversationConcepts } from "../lib/ai-concept-extractor.js";
import { logger } from "../lib/logger.js";
import {
  buildTutorSystemPrompt,
  inferFailedAttempts,
  getMistralModel,
  getMistralModelId,
  type ChatMessage,
  type TutorChapterContext,
  type TutorPersonalContext,
} from "../lib/mistral.js";
import {
  aiChatRepository,
  type AiChatMessageRow,
  type AiChatSessionMeta,
  type AiChatSessionSummary,
  type StoredMessageRow,
} from "../repositories/ai-chat.repository.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { learningPathService } from "./learning-path.service.js";
import { progressService } from "./progress.service.js";
import { createAiModelStrategy } from "./ai-model-strategy.js";
import {
  getCachedAiResponse,
  readAiCircuitState,
  setCachedAiResponse,
  writeAiCircuitState,
} from "./ai-model-strategy.store.js";

export type ChapterContextPayload = {
  context: TutorChapterContext;
  chapterId: number;
};

export const fallbackContext: TutorChapterContext = {
  board: "Punjab Board",
  grade: "9",
  subject: "General",
  chapterTitle: "Current topic",
  chapterSummary: "No chapter context was provided. Clarify the topic before teaching.",
};

export type ProactiveHint = {
  topic: string;
  message: string;
  reasons: string[];
};

export const proactiveHintSchema = z.object({
  topic: z.string(),
  message: z.string(),
  reasons: z.array(z.string()),
});

export type TurnClientMessage = {
  role: "user" | "assistant";
  content: string;
};

// --- Exercise picking by word overlap ---

type ExerciseQuestionRow = {
  question: string;
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);

const pickRelevantExerciseQuestion = (
  exerciseRows: ExerciseQuestionRow[],
  latestPrompt: string
): string | undefined => {
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
    const score = questionTokens.reduce(
      (total, token) => (promptTokens.has(token) ? total + 1 : total),
      0
    );
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        question: row.question,
        score,
      };
    }
  }

  return bestMatch?.question ?? exerciseRows[0]?.question;
};

// --- Chapter context assembly ---

/** Max characters of injected subpart content, to protect the model context window. */
const MAX_CONTEXT_SUMMARY_LENGTH = 12_000;

const EXERCISE_CONTEXT_LIMIT = 50;

class AiChatService {
  async buildChapterContext(
    chapterId: number,
    latestPrompt: string
  ): Promise<ChapterContextPayload | null> {
    const chapterRow = await aiChatRepository.getChapterWithSubjectBoard(chapterId);
    if (!chapterRow) {
      return null;
    }

    let summary = chapterRow.chapterSummary ?? "";

    // If the legacy summary column is empty, fall back to concatenated subparts
    if (summary.trim().length === 0) {
      const subpartRows = await aiChatRepository.listSubparts(chapterId);

      if (subpartRows.length > 0) {
        // Limit context injection size to prevent token blowup and model context window limits
        summary = subpartRows
          .map((sp) => `# ${sp.heading}\n${sp.content}`)
          .join("\n\n")
          .slice(0, MAX_CONTEXT_SUMMARY_LENGTH);
      }
    }

    const exerciseRows = await aiChatRepository.listExerciseQuestions(
      chapterId,
      EXERCISE_CONTEXT_LIMIT
    );

    const focusExerciseQuestion = pickRelevantExerciseQuestion(exerciseRows, latestPrompt);

    return {
      chapterId: chapterRow.chapterId,
      context: {
        board: chapterRow.boardName,
        grade: chapterRow.grade ?? "9",
        subject: chapterRow.subjectName,
        chapterTitle: chapterRow.chapterTitle,
        chapterSummary:
          summary.trim().length > 0 ? summary : "No chapter summary available for this chapter.",
        ...(focusExerciseQuestion ? { focusExerciseQuestion } : {}),
      },
    };
  }

  // --- Session listing ---

  async listGeneralSessions(userId: string): Promise<AiChatSessionSummary[]> {
    return aiChatRepository.listGeneralSessions(userId);
  }

  async getSessionDetail(
    userId: string,
    sessionId: string
  ): Promise<{
    session: AiChatSessionSummary;
    messages: AiChatMessageRow[];
    proactiveHint: ProactiveHint | null;
  } | null> {
    const sessionRow = await aiChatRepository.findGeneralSession(userId, sessionId);
    if (!sessionRow) {
      return null;
    }

    const [messageRows, confusionMetadata] = await Promise.all([
      aiChatRepository.listMessages(sessionRow.id),
      aiChatRepository.getLatestConfusionEventMetadata(sessionRow.id),
    ]);

    const latestConfusionEvent = proactiveHintSchema.safeParse(confusionMetadata);

    return {
      session: sessionRow,
      messages: messageRows,
      proactiveHint: latestConfusionEvent.success
        ? {
            topic: latestConfusionEvent.data.topic,
            message: latestConfusionEvent.data.message,
            reasons: latestConfusionEvent.data.reasons,
          }
        : null,
    };
  }

  // --- Session bootstrap for a chat turn ---

  async ensureSession(input: {
    userId: string;
    sessionId?: string;
    chapterContext: ChapterContextPayload | null;
    chapterId?: number;
    latestPrompt: string;
  }): Promise<
    { status: "not_found" } | { status: "error" } | { status: "ready"; session: AiChatSessionMeta }
  > {
    if (input.sessionId) {
      const existing = await aiChatRepository.findSessionMeta(input.userId, input.sessionId);
      if (!existing) {
        return { status: "not_found" };
      }
      return { status: "ready", session: existing };
    }

    const created = await aiChatRepository.createSession({
      userId: input.userId,
      chapterId: input.chapterContext?.chapterId ?? input.chapterId ?? null,
      title: this.buildSessionTitle(input.chapterContext, input.latestPrompt),
    });
    if (!created) {
      return { status: "error" };
    }
    return { status: "ready", session: created };
  }

  private truncateTitle(value: string): string {
    const clean = value.trim().replace(/\s+/g, " ");
    if (clean.length <= 90) {
      return clean;
    }
    return `${clean.slice(0, 87)}...`;
  }

  private buildSessionTitle(
    chapterContext: ChapterContextPayload | null,
    latestPrompt: string
  ): string {
    if (chapterContext) {
      return this.truncateTitle(
        `${chapterContext.context.subject}: ${chapterContext.context.chapterTitle}`
      );
    }
    return this.truncateTitle(latestPrompt);
  }

  // --- Turn preparation ---

  /**
   * Persists the incoming user message (deduplicated against the last stored
   * message), records the confusion event when a pattern is detected, and
   * builds the tutor system prompt from chapter + personal context.
   */
  async prepareTurn(input: {
    userId: string;
    session: AiChatSessionMeta;
    messages: TurnClientMessage[];
    mode: "explain" | "socratic";
    chapterContext: ChapterContextPayload | null;
    userBoard: string | null;
    userClass: string | null;
  }): Promise<{ systemPrompt: string; proactiveHint: ProactiveHint | null }> {
    const latestUserMessage = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (!latestUserMessage) {
      throw new Error("At least one user message is required.");
    }

    const latestStoredMessage = await aiChatRepository.getLatestStoredMessage(input.session.id);

    if (
      latestStoredMessage?.role !== "user" ||
      latestStoredMessage?.content !== latestUserMessage.content
    ) {
      await aiChatRepository.insertMessage(input.session.id, "user", latestUserMessage.content);
    }

    await aiChatRepository.touchSession(input.session.id);

    const persistedMessageRows: StoredMessageRow[] = await aiChatRepository.listStoredMessages(
      input.session.id
    );

    const confusionResult = detectConfusionPattern({
      messages: persistedMessageRows as ChatMessage[],
    });
    const proactiveHint: ProactiveHint | null = confusionResult.triggered
      ? {
          topic: getConfusionTopicLabel(input.chapterContext?.context ?? fallbackContext),
          message: buildProactiveHint(
            getConfusionTopicLabel(input.chapterContext?.context ?? fallbackContext)
          ),
          reasons: confusionResult.reasons,
        }
      : null;

    if (proactiveHint) {
      await aiChatRepository.insertConfusionEvent({
        sessionId: input.session.id,
        topic: proactiveHint.topic,
        message: proactiveHint.message,
        reasons: proactiveHint.reasons,
        chapterId: input.chapterContext?.chapterId ?? input.session.chapterId ?? null,
      });
    }

    const failedAttempts = inferFailedAttempts(input.messages as ChatMessage[]);

    // Fetch personal AI context for the user (non-blocking on failure)
    let personalContext: TutorPersonalContext | undefined;
    try {
      const [aiCtx, learningPath, adaptiveWeakAreas] = await Promise.all([
        aiContextRepository.findByUserId(input.userId),
        learningPathService.getLearningPath(input.userId, {
          boardSlug: input.userBoard ?? null,
          classSlug: input.userClass ?? null,
        }),
        progressService.getAdaptiveWeakAreaLabels(input.userId, 5),
      ]);

      const mergedWeakAreas = Array.from(
        new Set([...adaptiveWeakAreas, ...learningPath.studentWeakAreas])
      ).slice(0, 5);

      if (aiCtx) {
        personalContext = {
          weakTopics: aiCtx.weakTopics,
          strongTopics: aiCtx.strongTopics,
          studentWeakAreas: mergedWeakAreas,
          preferredExplanationStyle: aiCtx.preferredExplanationStyle,
          lastConceptsDiscussed: aiCtx.lastConceptsDiscussed,
        };
      } else if (mergedWeakAreas.length > 0) {
        personalContext = {
          weakTopics: [],
          strongTopics: [],
          studentWeakAreas: mergedWeakAreas,
          preferredExplanationStyle: "balanced",
          lastConceptsDiscussed: [],
        };
      }
    } catch (error) {
      logger.error({ error }, "Failed to fetch AI context for user");
    }

    const systemPrompt = buildTutorSystemPrompt({
      context: input.chapterContext?.context ?? fallbackContext,
      failedAttempts,
      mode: input.mode,
      ...(personalContext ? { personalContext } : {}),
    });

    return { systemPrompt, proactiveHint };
  }

  // --- Post-generation persistence ---

  /** Persists assistant output, usage log, and runs concept extraction. */
  async persistAssistantOutput(input: {
    userId: string;
    sessionId: string;
    latestUserText: string;
    assistantText: string;
    usage: {
      modelTier: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
    };
  }): Promise<void> {
    if (input.assistantText.length > 0) {
      await aiChatRepository.insertMessage(input.sessionId, "assistant", input.assistantText);
    }

    await aiChatRepository.insertUsageLog({
      userId: input.userId,
      sessionId: input.sessionId,
      modelTier: input.usage.modelTier,
      model: input.usage.model,
      promptTokens: input.usage.promptTokens,
      completionTokens: input.usage.completionTokens,
    });

    await aiChatRepository.touchSession(input.sessionId);

    if (input.assistantText.length === 0) {
      return;
    }

    try {
      const extraction = extractConversationConcepts(input.latestUserText, input.assistantText);

      if (extraction.conceptsDiscussed.length > 0) {
        await aiContextRepository.updateLastConcepts(input.userId, extraction.conceptsDiscussed);
      }

      for (const weakTopic of extraction.weakTopicCandidates) {
        await aiContextRepository.addWeakTopic(input.userId, weakTopic);
      }

      if (extraction.hasStrongSignal && extraction.conceptsDiscussed.length > 0) {
        const ctx = await aiContextRepository.findByUserId(input.userId);
        if (ctx) {
          for (const concept of extraction.conceptsDiscussed) {
            const normalizedConcept = concept.trim().toLowerCase();
            if (ctx.weakTopics.includes(normalizedConcept)) {
              await aiContextRepository.removeWeakTopic(input.userId, normalizedConcept);
              await aiContextRepository.addStrongTopic(input.userId, normalizedConcept);
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, "AI concept extraction failed (non-critical)");
    }
  }
}

// --- AI model strategy wiring (Mistral provider + circuit breaker/cache store) ---

export const aiChatModelStrategy = createAiModelStrategy({
  readCircuitState: async () => readAiCircuitState(),
  writeCircuitState: async ({ state }) => writeAiCircuitState(state),
  getCachedResponse: async ({ normalizedPrompt }) => getCachedAiResponse(normalizedPrompt),
  setCachedResponse: async ({ normalizedPrompt, responseText }) =>
    setCachedAiResponse(normalizedPrompt, responseText),
  invokeModel: async ({ tier, system, messages, maxOutputTokens, temperature }) => {
    const model = getMistralModel(tier);
    const modelId = getMistralModelId(tier);
    const result = await generateText({
      model,
      system,
      messages: messages as ModelMessage[],
      maxOutputTokens,
      temperature,
    });

    return {
      text: result.text,
      model: modelId,
      modelTier: tier,
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
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
      temperature,
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
          completionTokens: usage.outputTokens ?? 0,
        };
      })(),
    };
  },
  sleep: async (delayMs) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  },
});

export const aiChatService = new AiChatService();
