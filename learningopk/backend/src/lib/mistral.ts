import { createMistral } from "@ai-sdk/mistral";

import { env } from "./env.js";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TutorChapterContext = {
  board: string;
  grade: "9" | "10";
  subject: string;
  chapterTitle: string;
  chapterSummary: string;
  focusExerciseQuestion?: string;
};

export type TutorPersonalContext = {
  weakTopics: string[];
  strongTopics: string[];
  studentWeakAreas?: string[];
  preferredExplanationStyle: string;
  lastConceptsDiscussed: string[];
  recentQuizFailure?: {
    chapterTitle: string;
    scorePercent: number;
  };
};

export type TutorResponseStage = "guide" | "hint" | "reveal";
export type TutorMode = "explain" | "socratic";

export const MISTRAL_MODEL_IDS = {
  "mistral-tiny": "mistral-tiny-latest",
  "mistral-small": "mistral-small-latest",
  "mistral-medium": "mistral-medium-latest",
} as const;

export const MISTRAL_MODEL_ID = MISTRAL_MODEL_IDS["mistral-small"];

export const MISTRAL_COMPLETION_MAX_TOKENS = 2048;
export const MISTRAL_TEMPERATURE = 0.7;

const mistralProvider = createMistral({
  apiKey: env.MISTRAL_API_KEY,
});

export const mistralModel = mistralProvider(MISTRAL_MODEL_ID);

export const getMistralModel = (modelTier: keyof typeof MISTRAL_MODEL_IDS) =>
  mistralProvider(MISTRAL_MODEL_IDS[modelTier]);

export const getMistralModelId = (modelTier: keyof typeof MISTRAL_MODEL_IDS) =>
  MISTRAL_MODEL_IDS[modelTier];

const stageInstructions: Record<TutorResponseStage, string> = {
  guide:
    "STAGE: GUIDE QUESTION. Ask one focused guiding question first. Do not reveal the answer yet. Keep to 3-5 short sentences.",
  hint: "STAGE: STRUCTURED HINT. The student seems stuck once. Give a compact hint, then ask the next guiding question. Do not reveal the full solution yet.",
  reveal:
    "STAGE: CONCISE REVEAL. The student appears stuck after 2 attempts. Provide a brief worked solution, then ask a checkpoint question.",
};

const LATEX_DELIMITER_RULES = [
  "Always return valid Markdown.",
  "For inline math, wrap in single dollar signs: $F = ma$.",
  "For block/display math, wrap in double dollar signs on their own line:",
  "$$",
  "\\frac{dy}{dx} = f'(g(x)) \\cdot g'(x)",
  "$$",
  "NEVER use square-bracket delimiters \\[...\\] or parenthesis delimiters \\(...\\) for math. Only dollar-sign delimiters are supported.",
];

const modeInstructions: Record<TutorMode, string[]> = {
  explain: [
    "MODE: EXPLAIN.",
    "Give the direct explanation first.",
    "Be straightforward, teacher-like, and concise.",
    ...LATEX_DELIMITER_RULES,
    "Use short Markdown sections when they help clarity, such as `## Idea`, `## Formula`, `## Steps`, and `## Final Answer`.",
  ],
  socratic: [
    "MODE: SOCRATIC.",
    "Use the Socratic method to lead the student to the answer.",
    "Give a tiny hint first when useful, then ask one focused guiding question.",
    ...LATEX_DELIMITER_RULES,
  ],
};

export const inferFailedAttempts = (messages: ChatMessage[]): number => {
  const userTurns = messages.reduce(
    (count, message) => (message.role === "user" ? count + 1 : count),
    0
  );
  if (userTurns <= 1) {
    return 0;
  }
  if (userTurns === 2) {
    return 1;
  }
  return 2;
};

export const getTutorResponseStage = (failedAttempts: number): TutorResponseStage => {
  if (failedAttempts >= 2) {
    return "reveal";
  }
  if (failedAttempts === 1) {
    return "hint";
  }
  return "guide";
};

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

export const buildTutorSystemPrompt = (params: {
  context: TutorChapterContext;
  failedAttempts: number;
  mode: TutorMode;
  personalContext?: TutorPersonalContext;
}): string => {
  const { context, failedAttempts, mode, personalContext } = params;
  const stage = getTutorResponseStage(failedAttempts);

  const lines: string[] = [
    "You are an AI tutor for Pakistani 9th/10th grade students.",
    mode === "socratic"
      ? "Use the Socratic method with controlled reveal policy."
      : "Explain concepts directly with clear, structured teaching.",
    "",
    "Core rules:",
    "- Keep responses concise and readable for a 14-16 year old student.",
    "- Use simple English for a 14-16 year old student.",
    "- Be warm, patient, encouraging, and precise.",
    "- Always return valid Markdown.",
    "- For math: use $...$ for inline math and $$...$$ for block math. NEVER use \\\\[...\\\\] or \\\\(...\\\\) delimiters.",
    "- Make the answer visually clean with short paragraphs, bullet points, or numbered steps when helpful.",
    "- If the student is correct, praise briefly and move to the next step.",
    "- If the student is incorrect, point out one mistake gently and ask them to try again.",
    "",
    ...modeInstructions[mode],
    "",
  ];

  if (mode === "socratic") {
    lines.push(
      "Controlled reveal policy:",
      "- Attempt 0: guiding question.",
      "- Attempt 1: structured hint, then a guiding question.",
      "- Attempt 2+: concise worked solution, then a checkpoint question.",
      "",
      `Current stage rule: ${stageInstructions[stage]}`,
      ""
    );
  } else {
    lines.push(
      "Explain mode rules:",
      "- Give the direct explanation first instead of leading with questions.",
      "- If a formula is relevant, state it clearly before using it.",
      "- End with a short final takeaway or final answer when useful.",
      ""
    );
  }

  lines.push(
    "Chapter context:",
    `- board=${normalizeText(context.board)}`,
    `- grade=${context.grade}`,
    `- subject=${normalizeText(context.subject)}`,
    `- chapter=${normalizeText(context.chapterTitle)}`,
    `- summary=${normalizeText(context.chapterSummary)}`,
    context.focusExerciseQuestion
      ? `- focus_exercise=${normalizeText(context.focusExerciseQuestion)}`
      : "- focus_exercise=none"
  );

  // Inject personal context when available
  if (personalContext) {
    const personalLines: string[] = [];

    if (personalContext.weakTopics.length > 0) {
      personalLines.push(
        `The student has identified weaknesses in: ${personalContext.weakTopics.join(", ")}. Give extra attention and simpler explanations for these areas.`
      );
    }

    if (personalContext.strongTopics.length > 0) {
      personalLines.push(
        `The student is strong in: ${personalContext.strongTopics.join(", ")}. You can reference these as building blocks.`
      );
    }

    if (personalContext.studentWeakAreas && personalContext.studentWeakAreas.length > 0) {
      personalLines.push(
        `Quiz history weak areas to proactively monitor: ${personalContext.studentWeakAreas.join(", ")}. Offer support before the student explicitly asks when these areas come up, and steer the student toward extra practice in those weak areas.`
      );
    }

    if (
      personalContext.preferredExplanationStyle &&
      personalContext.preferredExplanationStyle !== "balanced"
    ) {
      personalLines.push(
        `The student prefers ${personalContext.preferredExplanationStyle} explanations.`
      );
    }

    if (personalContext.lastConceptsDiscussed.length > 0) {
      personalLines.push(
        `Recently discussed: ${personalContext.lastConceptsDiscussed.join(", ")}. Build on this context when relevant.`
      );
    }

    if (personalContext.recentQuizFailure) {
      personalLines.push(
        `I see you scored ${personalContext.recentQuizFailure.scorePercent}% on ${personalContext.recentQuizFailure.chapterTitle}. Proactively reference this and offer to help strengthen understanding of that topic.`
      );
    }

    if (personalLines.length > 0) {
      lines.push("", "Student personal context:");
      for (const line of personalLines) {
        lines.push(`- ${line}`);
      }
    }
  }

  return lines.join("\n");
};
