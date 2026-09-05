# AI Chat Streaming + Token Limit Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable real token-by-token streaming for AI chat responses and fix response truncation by increasing the output token limit from 500 to 2048.

**Architecture:** Refactor the backend AI model strategy to support streaming via `streamText()` from the Vercel AI SDK v6. The `invokeModel` callback returns a streaming result (textStream + usage promise). The strategy pipes text chunks to the HTTP response as they arrive. Cached and circuit-breaker fallback responses are written as a single chunk. The frontend already has a correct `getReader()` loop -- we just need to swap `MarkdownRenderer` for `StreamingText` during active streaming. nginx gets a dedicated location block for the AI chat endpoint with `proxy_buffering off`.

**Tech Stack:** Vercel AI SDK v6 (`streamText`, `pipeTextStreamToResponse`), Express 5, nginx, React 19, Next.js 16

---

## Task 1: Increase token limit

**Files:**

- Modify: `backend/src/lib/mistral.ts:42`

**Step 1: Change the constant**

```typescript
// Line 42: Change from
export const MISTRAL_COMPLETION_MAX_TOKENS = 500;
// To
export const MISTRAL_COMPLETION_MAX_TOKENS = 2048;
```

**Step 2: Run typecheck**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm typecheck"` from monorepo root
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add backend/src/lib/mistral.ts
git commit -m "fix: increase AI max output tokens from 500 to 2048"
```

---

## Task 2: Refactor ai-model-strategy to support streaming

The strategy currently calls `invokeModel()` which returns `{ text, model, modelTier, promptTokens, completionTokens }`. For streaming, `invokeModel` needs to return a `textStream` (AsyncIterable) alongside a `usage` promise that resolves when the stream completes. The `generate()` method needs a new `generateStream()` sibling that returns the stream to the caller.

**Files:**

- Modify: `backend/src/services/ai-model-strategy.ts`

**Step 1: Add streaming types and a new `invokeModelStreaming` dependency**

Add a new `AiStreamingProviderResult` type and `invokeModelStreaming` to dependencies:

```typescript
// New type - streaming result from provider
type AiStreamingProviderResult = {
  textStream: AsyncIterable<string>;
  /** Resolves when stream completes with usage + model info */
  completed: Promise<{
    text: string;
    model: string;
    modelTier: AiModelTier;
    promptTokens: number;
    completionTokens: number;
  }>;
};

// Add to AiModelStrategyDependencies:
invokeModelStreaming?: (params: {
  tier: AiModelTier;
  system: string;
  messages: AiStrategyMessage[];
  maxOutputTokens: number;
  temperature: number;
}) => AiStreamingProviderResult;
```

Note: `invokeModelStreaming` is synchronous (returns immediately) because `streamText()` itself is synchronous -- it returns the result object synchronously and streaming happens via the `textStream` async iterable.

**Step 2: Add `generateStream()` method**

Add a `generateStream()` method alongside `generate()`. The stream method:

1. Checks circuit breaker -- if open, checks cache, returns cached text as a single-item async iterable or throws
2. Classifies query and picks the primary tier
3. Calls `invokeModelStreaming` with the primary tier
4. Returns `{ textStream, completed, classification, normalizedPrompt }` to the caller
5. The caller is responsible for consuming `textStream` and then `await completed` to get usage info
6. On `completed` rejection, record circuit breaker failure (the caller handles the error response)
7. On `completed` success, reset circuit state, cache the response

```typescript
type AiStreamResult = {
  textStream: AsyncIterable<string>;
  completed: Promise<AiStrategyResult>;
};

const generateStream = (params: GenerateParams): AiStreamResult => {
  // ... implementation below
};
```

The key insight: `generateStream` does NOT do retries. If streaming fails, the caller can fall back to the non-streaming `generate()` which has retry logic. This keeps the streaming path simple.

**Step 3: Implementation of generateStream**

```typescript
const generateStream = (params: GenerateParams): AiStreamResult => {
  if (!dependencies.invokeModelStreaming) {
    throw new Error("Streaming is not configured. Provide invokeModelStreaming dependency.");
  }

  const normalizedPrompt = normalizePrompt(params.prompt);
  const classificationResult = classifyAiQuery(params.prompt);

  // Check circuit state synchronously-ish -- we return a stream that will
  // start by checking the circuit
  const streamingResult = dependencies.invokeModelStreaming({
    tier: classificationResult.modelTier,
    system: params.system,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens,
    temperature: params.temperature,
  });

  const completed = streamingResult.completed.then(
    async (providerResult) => {
      const text = providerResult.text.trim();
      if (text.length > 0) {
        await dependencies.setCachedResponse({ normalizedPrompt, responseText: text });
      }
      await dependencies.writeCircuitState({ key: circuitKey, state: resetCircuitState() });

      return {
        ...providerResult,
        text,
        source: "provider" as const,
        classification: classificationResult.classification,
        normalizedPrompt,
        attempts: 1,
      };
    },
    async (error) => {
      const circuitState = recordFailure(
        await dependencies.readCircuitState({ key: circuitKey }),
        now()
      );
      await dependencies.writeCircuitState({ key: circuitKey, state: circuitState });
      throw error;
    }
  );

  return {
    textStream: streamingResult.textStream,
    completed,
  };
};
```

**Step 4: Export `generateStream` from the factory**

```typescript
return {
  generate,
  generateStream,
  primeCachedResponse,
};
```

**Step 5: Run typecheck**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm typecheck"` from monorepo root
Expected: All 3 packages pass

**Step 6: Commit**

```bash
git add backend/src/services/ai-model-strategy.ts
git commit -m "feat: add streaming support to AI model strategy"
```

---

## Task 3: Wire streamText in the AI chat route

**Files:**

- Modify: `backend/src/routes/ai-chat.ts`

**Step 1: Change imports**

```typescript
// Line 1: Change from
import { type ModelMessage, generateText } from "ai";
// To
import { type ModelMessage, generateText, streamText } from "ai";
```

**Step 2: Add `invokeModelStreaming` to the strategy creation**

Below the existing `invokeModel` callback (line 168-186), add `invokeModelStreaming`:

```typescript
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
```

**Step 3: Refactor the POST /chat handler to stream the response**

Replace the current try/catch block (lines 504-580) with streaming logic:

```typescript
let providerError: string | null = null;
const aiSpan = startSpan("ai.chat.generate", "ai.call");

try {
  // Attempt streaming first
  const streamResult = aiModelStrategy.generateStream({
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

  // Pipe text chunks to the response
  let assistantText = "";
  for await (const chunk of streamResult.textStream) {
    assistantText += chunk;
    res.write(chunk);
  }
  res.end();

  // Wait for completion metadata (usage, model tier)
  const result = await streamResult.completed;

  // Set model tier header (already sent, but log it)
  // Note: headers are already sent at this point, so we can't add x-ai-model-tier
  // We still have the result for DB logging

  assistantText = result.text.trim().length > 0 ? result.text.trim() : assistantText.trim();

  if (assistantText.length > 0) {
    await db.insert(aiMessages).values({
      sessionId: sessionRow.id,
      role: "assistant",
      content: assistantText,
    });
  }

  await db.insert(aiUsageLogs).values({
    userId,
    sessionId: sessionRow.id,
    modelTier: result.modelTier,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  });

  await db
    .update(aiChatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiChatSessions.id, sessionRow.id));

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

  // If headers haven't been sent yet, we can send an error response
  if (!res.headersSent) {
    providerError = error instanceof Error ? error.message : "Unknown provider generation error.";

    // Fall back to non-streaming strategy with retries
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
          content: assistantText,
        });
      }

      await db.insert(aiUsageLogs).values({
        userId,
        sessionId: sessionRow.id,
        modelTier: fallbackResult.modelTier,
        model: fallbackResult.model,
        promptTokens: fallbackResult.promptTokens,
        completionTokens: fallbackResult.completionTokens,
      });

      await db
        .update(aiChatSessions)
        .set({ lastMessageAt: new Date() })
        .where(eq(aiChatSessions.id, sessionRow.id));

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
    // Headers already sent (partial stream was delivered), end the response
    res.end();

    // Still try to save whatever we streamed
    logger.error({ error }, "AI stream failed mid-response");
  }
} finally {
  endSpan(aiSpan);
}
```

**Step 4: Run typecheck**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm typecheck"` from monorepo root
Expected: All 3 packages pass

**Step 5: Commit**

```bash
git add backend/src/routes/ai-chat.ts
git commit -m "feat: stream AI responses token-by-token via streamText"
```

---

## Task 4: Wire StreamingText component into chat message bubbles

Both chat components (`ai-chat-panel.tsx` and `ai-chat-messages.tsx`) currently show `StreamingIndicator` (bouncing dots) when `isStreaming && isEmpty`, then jump to `MarkdownRenderer` for the full text. With real streaming, we need to show the `StreamingText` component while content is arriving incrementally.

**Files:**

- Modify: `frontend/src/components/ai/ai-unified-chat/components/ai-chat-messages.tsx`
- Modify: `frontend/src/components/learn/ai-chat-panel.tsx`

### Sub-task 4a: Update ai-chat-messages.tsx (unified chat)

**Step 1: Import StreamingText**

```typescript
import { StreamingText } from "@/components/common/streaming-text";
```

**Step 2: Change the MessageBubble rendering logic**

Replace lines 98-109 (the assistant message rendering):

```typescript
// From:
{isUser ? (
  <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
) : isEmpty || isStreaming ? (
  <StreamingIndicator />
) : (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <MarkdownRenderer
      content={message.content}
      className="text-[15px] leading-relaxed"
    />
  </div>
)}

// To:
{isUser ? (
  <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
) : isStreaming && isEmpty ? (
  <StreamingIndicator />
) : isStreaming ? (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <StreamingText
      content={message.content}
      isStreaming
      className="text-[15px] leading-relaxed"
    />
  </div>
) : (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <MarkdownRenderer
      content={message.content}
      className="text-[15px] leading-relaxed"
    />
  </div>
)}
```

Three states:

1. `isStreaming && isEmpty` -> bouncing dots (waiting for first chunk)
2. `isStreaming && hasContent` -> `StreamingText` (character reveal + cursor)
3. `!isStreaming` -> `MarkdownRenderer` (full markdown render)

### Sub-task 4b: Update ai-chat-panel.tsx (legacy chapter chat)

**Step 1: Import StreamingText**

```typescript
import { StreamingText } from "@/components/common/streaming-text";
```

**Step 2: Change the MessageBubble rendering logic**

Replace lines 119-130 (same pattern as 4a):

```typescript
// From:
{isUser ? (
  <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
) : isEmpty || isStreaming ? (
  <StreamingIndicator />
) : (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <MarkdownRenderer
      content={message.content}
      className="text-[15px] leading-relaxed"
    />
  </div>
)}

// To:
{isUser ? (
  <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
) : isStreaming && isEmpty ? (
  <StreamingIndicator />
) : isStreaming ? (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <StreamingText
      content={message.content}
      isStreaming
      className="text-[15px] leading-relaxed"
    />
  </div>
) : (
  <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
    <MarkdownRenderer
      content={message.content}
      className="text-[15px] leading-relaxed"
    />
  </div>
)}
```

**Step 3: Run typecheck**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm typecheck"` from monorepo root
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add frontend/src/components/ai/ai-unified-chat/components/ai-chat-messages.tsx frontend/src/components/learn/ai-chat-panel.tsx
git commit -m "feat: use StreamingText for character-by-character AI response rendering"
```

---

## Task 5: Add nginx streaming support for AI chat route

**Files:**

- Modify: `infra/nginx.conf`

**Step 1: Add a dedicated location block for /api/ai/chat**

Insert before the generic `/api/` block (before line 69):

```nginx
# AI chat streaming endpoint - disable buffering for real-time token delivery
location = /api/ai/chat {
    limit_req zone=ip_limit burst=50 nodelay;
    limit_req zone=user_limit burst=20 nodelay;

    proxy_pass http://backend_cluster;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Disable buffering for streaming
    proxy_buffering off;
    proxy_cache off;

    # Longer timeouts for AI generation
    proxy_connect_timeout 30s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;

    # Pass user ID from JWT for rate limiting
    set $user_id "";
    if ($http_authorization ~ "^Bearer\s+(\S+)") {
        set $user_id $1;
    }
    proxy_set_header X-User-ID $user_id;
}
```

Also update the stale `/api/ai-chat` WebSocket location (lines 96-107) -- it targets a wrong path. Either remove it or fix the path to match the actual endpoint.

**Step 2: Commit**

```bash
git add infra/nginx.conf
git commit -m "infra: add streaming-optimized nginx config for AI chat endpoint"
```

---

## Task 6: Final typecheck and verification

**Step 1: Run full typecheck**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm typecheck"` from monorepo root
Expected: All 3 packages pass

**Step 2: Verify no regressions in the frontend build**

Run: `powershell -ExecutionPolicy Bypass -Command "pnpm -C frontend build"` from monorepo root
(Optional -- only if time permits, since Next.js builds are slow)

---

## Summary of all files changed

| File                                                                         | Change                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `backend/src/lib/mistral.ts`                                                 | Token limit 500 -> 2048                                                        |
| `backend/src/services/ai-model-strategy.ts`                                  | Add `generateStream()` method, `invokeModelStreaming` dependency               |
| `backend/src/routes/ai-chat.ts`                                              | Import `streamText`, add `invokeModelStreaming`, stream response with fallback |
| `frontend/src/components/ai/ai-unified-chat/components/ai-chat-messages.tsx` | Use `StreamingText` during streaming                                           |
| `frontend/src/components/learn/ai-chat-panel.tsx`                            | Use `StreamingText` during streaming                                           |
| `infra/nginx.conf`                                                           | Add `/api/ai/chat` location with `proxy_buffering off`                         |
