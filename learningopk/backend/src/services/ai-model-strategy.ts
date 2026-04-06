export type AiQueryClassification = "simple" | "standard" | "complex";
export type AiModelTier = "mistral-tiny" | "mistral-small" | "mistral-medium";

export type AiStrategyMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiCircuitState = {
  consecutiveFailures: number;
  lastFailureAt: number | null;
  openedAt: number | null;
};

type AiProviderResult = {
  text: string;
  model: string;
  modelTier: AiModelTier;
  promptTokens: number;
  completionTokens: number;
};

type AiStrategyResult = AiProviderResult & {
  source: "provider" | "cache";
  classification: AiQueryClassification;
  normalizedPrompt: string;
  attempts: number;
};

type GenerateParams = {
  prompt: string;
  messages: AiStrategyMessage[];
  system: string;
  maxOutputTokens: number;
  temperature: number;
};

type AiModelStrategyDependencies = {
  readCircuitState: (params: { key: string }) => Promise<AiCircuitState>;
  writeCircuitState: (params: { key: string; state: AiCircuitState }) => Promise<void>;
  getCachedResponse: (params: { normalizedPrompt: string }) => Promise<string | null>;
  setCachedResponse: (params: { normalizedPrompt: string; responseText: string }) => Promise<void>;
  invokeModel: (params: {
    tier: AiModelTier;
    system: string;
    messages: AiStrategyMessage[];
    maxOutputTokens: number;
    temperature: number;
  }) => Promise<AiProviderResult>;
  sleep: (delayMs: number) => Promise<void>;
  now?: () => number;
  circuitKey?: string;
};

const FAILURE_WINDOW_MS = 60_000;
const MAX_RETRY_ATTEMPTS = 3;
const CIRCUIT_OPEN_THRESHOLD = 5;
const BACKOFF_BASE_MS = 200;
const DEFAULT_CIRCUIT_KEY = "ai:model-strategy:circuit";

const SIMPLE_PROMPT_PATTERNS = [
  /^what is\b/i,
  /^who is\b/i,
  /^when is\b/i,
  /^when did\b/i,
  /^where is\b/i,
  /^define\b/i,
  /^state\b/i,
  /^name\b/i,
  /formula of/i,
  /meaning of/i,
];

const COMPLEX_PROMPT_PATTERNS = [
  /step by step/i,
  /multi[-\s]?step/i,
  /why\b/i,
  /explain how/i,
  /derive\b/i,
  /prove\b/i,
  /analy[sz]e\b/i,
  /compare\b.*\bcontrast\b/i,
  /before giving the final answer/i,
  /show your reasoning/i,
];

const defaultCircuitState = (): AiCircuitState => ({
  consecutiveFailures: 0,
  lastFailureAt: null,
  openedAt: null,
});

const countTokens = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

export const normalizePrompt = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

export const classifyAiQuery = (prompt: string): {
  classification: AiQueryClassification;
  modelTier: AiModelTier;
  tokenCount: number;
} => {
  const normalizedPrompt = normalizePrompt(prompt);
  const tokenCount = countTokens(normalizedPrompt);

  const isSimple = tokenCount < 50 && SIMPLE_PROMPT_PATTERNS.some((pattern) => pattern.test(normalizedPrompt));
  if (isSimple) {
    return { classification: "simple", modelTier: "mistral-tiny", tokenCount };
  }

  const isComplex = tokenCount >= 50 || COMPLEX_PROMPT_PATTERNS.some((pattern) => pattern.test(normalizedPrompt));
  if (isComplex) {
    return { classification: "complex", modelTier: "mistral-medium", tokenCount };
  }

  return { classification: "standard", modelTier: "mistral-small", tokenCount };
};

const buildTierChain = (primaryTier: AiModelTier): AiModelTier[] => {
  switch (primaryTier) {
    case "mistral-tiny":
      return ["mistral-tiny", "mistral-small", "mistral-medium"];
    case "mistral-medium":
      return ["mistral-medium", "mistral-small", "mistral-tiny"];
    case "mistral-small":
    default:
      return ["mistral-small", "mistral-medium", "mistral-tiny"];
  }
};

const isCircuitOpen = (state: AiCircuitState, now: number): boolean =>
  state.openedAt !== null && now - state.openedAt < FAILURE_WINDOW_MS;

const recordFailure = (state: AiCircuitState, now: number): AiCircuitState => {
  const isRecentFailure = state.lastFailureAt !== null && now - state.lastFailureAt < FAILURE_WINDOW_MS;
  const consecutiveFailures = isRecentFailure ? state.consecutiveFailures + 1 : 1;

  return {
    consecutiveFailures,
    lastFailureAt: now,
    openedAt: consecutiveFailures >= CIRCUIT_OPEN_THRESHOLD ? now : state.openedAt,
  };
};

const resetCircuitState = (): AiCircuitState => defaultCircuitState();

const buildCircuitOpenError = (): Error => new Error("AI circuit breaker is open and no cached response is available.");

export const createAiModelStrategy = (dependencies: AiModelStrategyDependencies) => {
  const now = dependencies.now ?? (() => Date.now());
  const circuitKey = dependencies.circuitKey ?? DEFAULT_CIRCUIT_KEY;

  const primeCachedResponse = async (params: { prompt: string; responseText: string }): Promise<void> => {
    await dependencies.setCachedResponse({
      normalizedPrompt: normalizePrompt(params.prompt),
      responseText: params.responseText,
    });
  };

  const generate = async (params: GenerateParams): Promise<AiStrategyResult> => {
    const normalizedPrompt = normalizePrompt(params.prompt);
    const classificationResult = classifyAiQuery(params.prompt);
    const tierChain = buildTierChain(classificationResult.modelTier).slice(0, MAX_RETRY_ATTEMPTS);

    let circuitState = await dependencies.readCircuitState({ key: circuitKey });
    const currentTime = now();

    if (isCircuitOpen(circuitState, currentTime)) {
      const cachedResponse = await dependencies.getCachedResponse({ normalizedPrompt });
      if (cachedResponse) {
        return {
          source: "cache",
          text: cachedResponse,
          model: "cache",
          modelTier: classificationResult.modelTier,
          promptTokens: 0,
          completionTokens: 0,
          classification: classificationResult.classification,
          normalizedPrompt,
          attempts: 0,
        };
      }

      throw buildCircuitOpenError();
    }

    let lastError: unknown;

    for (const [index, tier] of tierChain.entries()) {
      try {
        const providerResult = await dependencies.invokeModel({
          tier,
          system: params.system,
          messages: params.messages,
          maxOutputTokens: params.maxOutputTokens,
          temperature: params.temperature,
        });

        const text = providerResult.text.trim();
        if (text.length > 0) {
          await dependencies.setCachedResponse({ normalizedPrompt, responseText: text });
        }

        await dependencies.writeCircuitState({ key: circuitKey, state: resetCircuitState() });

        return {
          ...providerResult,
          text,
          source: "provider",
          classification: classificationResult.classification,
          normalizedPrompt,
          attempts: index + 1,
        };
      } catch (error) {
        lastError = error;
        circuitState = recordFailure(circuitState, now());
        await dependencies.writeCircuitState({ key: circuitKey, state: circuitState });

        if (isCircuitOpen(circuitState, now())) {
          const cachedResponse = await dependencies.getCachedResponse({ normalizedPrompt });
          if (cachedResponse) {
            return {
              source: "cache",
              text: cachedResponse,
              model: "cache",
              modelTier: classificationResult.modelTier,
              promptTokens: 0,
              completionTokens: 0,
              classification: classificationResult.classification,
              normalizedPrompt,
              attempts: index + 1,
            };
          }

          throw buildCircuitOpenError();
        }

        if (index < tierChain.length - 1) {
          await dependencies.sleep(BACKOFF_BASE_MS * 2 ** index);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("AI generation failed after all retries.");
  };

  return {
    generate,
    primeCachedResponse,
  };
};
