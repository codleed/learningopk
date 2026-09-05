import { type ModelMessage } from "ai";
import { Router } from "express";
import { z } from "zod";

import { consumeAiChatRateLimit, moderateAiInput } from "../lib/ai-guardrails.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import {
  MISTRAL_COMPLETION_MAX_TOKENS,
  MISTRAL_TEMPERATURE,
  type ChatMessage,
} from "../lib/mistral.js";
import { startSpan, endSpan } from "../lib/performance.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import {
  aiChatModelStrategy,
  aiChatService,
  type ProactiveHint,
} from "../services/ai-chat.service.js";

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
    content: z.string().trim().min(1).max(USER_MESSAGE_MAX_LENGTH),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
  }),
]);

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  mode: z.enum(["explain", "socratic"]).default("explain"),
  chapterId: z.number().int().positive().optional(),
  sessionId: z.string().uuid().optional(),
});

export const aiChatRouter = Router();

const sessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

function setProactiveHintHeader(
  res: { setHeader: (name: string, value: string) => unknown },
  proactiveHint: ProactiveHint | null
): void {
  if (proactiveHint) {
    res.setHeader("x-ai-proactive-hint", encodeURIComponent(JSON.stringify(proactiveHint)));
  }
}

aiChatRouter.get("/sessions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const sessions = await aiChatService.listGeneralSessions(userId);

  res.status(200).json({
    sessions,
  });
});

aiChatRouter.get("/sessions/:sessionId/messages", requireSession, async (req, res) => {
  const parsedParams = sessionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid AI session ID.",
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const detail = await aiChatService.getSessionDetail(userId, parsedParams.data.sessionId);
  if (!detail) {
    res.status(404).json({
      error: "AI session not found.",
    });
    return;
  }

  res.status(200).json({
    session: detail.session,
    messages: detail.messages,
    proactiveHint: detail.proactiveHint,
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
    logger.warn({ validationErrors: flattenedErrors }, "[ai-chat] validation failed");
    res.status(400).json({
      error: "Invalid AI chat payload",
      details: flattenedErrors,
    });
    return;
  }

  const { messages, chapterId, mode, sessionId } = parsed.data;
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    res.status(400).json({
      error: "At least one user message is required.",
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const moderation = moderateAiInput(latestUserMessage.content);
  if (moderation.blocked) {
    res.status(422).json({
      error: "Message blocked by AI safety checks.",
      reason: moderation.reason,
    });
    return;
  }

  let rateLimit: Awaited<ReturnType<typeof consumeAiChatRateLimit>>;
  try {
    rateLimit = await consumeAiChatRateLimit(userId);
  } catch (error) {
    logger.error({ error }, "AI rate limit check failed");
    res.status(503).json({
      error: "AI rate limiting is temporarily unavailable.",
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
      retryAfterSeconds: rateLimit.resetSeconds,
    });
    return;
  }

  const chapterContext = chapterId
    ? await aiChatService.buildChapterContext(chapterId, latestUserMessage.content)
    : null;

  if (chapterId && !chapterContext) {
    res.status(404).json({
      error: "Chapter not found for AI context injection.",
    });
    return;
  }

  const ensuredSession = await aiChatService.ensureSession({
    userId,
    ...(sessionId ? { sessionId } : {}),
    chapterContext,
    ...(chapterId !== undefined ? { chapterId } : {}),
    latestPrompt: latestUserMessage.content,
  });

  if (ensuredSession.status === "not_found") {
    res.status(404).json({
      error: "AI session not found.",
    });
    return;
  }

  if (ensuredSession.status === "error") {
    res.status(500).json({
      error: "Unable to initialize AI chat session.",
    });
    return;
  }

  const sessionRow = ensuredSession.session;

  const { systemPrompt, proactiveHint } = await aiChatService.prepareTurn({
    userId,
    session: sessionRow,
    messages,
    mode,
    chapterContext,
    userBoard: authedReq.session.user.board ?? null,
    userClass: authedReq.session.user.class ?? null,
  });

  const modelMessages: ModelMessage[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  let providerError: string | null = null;
  const aiSpan = startSpan("ai.chat.generate", "ai.call");

  try {
    // Attempt streaming first
    const streamResult = await aiChatModelStrategy.generateStream({
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
    setProactiveHintHeader(res, proactiveHint);

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

    await aiChatService.persistAssistantOutput({
      userId,
      sessionId: sessionRow.id,
      latestUserText: latestUserMessage.content,
      assistantText,
      usage: {
        modelTier: result.modelTier,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      },
    });
  } catch (error) {
    logger.error({ error }, "AI streaming generation error");

    if (!res.headersSent) {
      // Headers not sent yet — fall back to non-streaming strategy with retries
      try {
        const fallbackResult = await aiChatModelStrategy.generate({
          prompt: latestUserMessage.content,
          messages: modelMessages as ChatMessage[],
          system: systemPrompt,
          maxOutputTokens: MISTRAL_COMPLETION_MAX_TOKENS,
          temperature: MISTRAL_TEMPERATURE,
        });

        const assistantText = fallbackResult.text.trim();

        await aiChatService.persistAssistantOutput({
          userId,
          sessionId: sessionRow.id,
          latestUserText: latestUserMessage.content,
          assistantText,
          usage: {
            modelTier: fallbackResult.modelTier,
            model: fallbackResult.model,
            promptTokens: fallbackResult.promptTokens,
            completionTokens: fallbackResult.completionTokens,
          },
        });

        res.status(200);
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.setHeader("x-ai-session-id", sessionRow.id);
        res.setHeader("x-ai-model-tier", fallbackResult.modelTier);
        setProactiveHintHeader(res, proactiveHint);
        res.write(assistantText);
        res.end();
      } catch (fallbackError) {
        logger.error({ error: fallbackError }, "AI fallback generation also failed");
        providerError =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown provider generation error.";
        res.status(502).json({
          error: providerError ?? "Failed to generate AI response from the provider.",
          sessionId: sessionRow.id,
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
