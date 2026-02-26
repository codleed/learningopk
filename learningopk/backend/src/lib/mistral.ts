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

export type TutorResponseStage = "guide" | "hint" | "reveal";

export const MISTRAL_MODEL_ID = "mistral-small-latest";

export const MISTRAL_COMPLETION_MAX_TOKENS = 500;
export const MISTRAL_TEMPERATURE = 0.7;

const mistralProvider = createMistral({
  apiKey: env.MISTRAL_API_KEY
});

export const mistralModel = mistralProvider(MISTRAL_MODEL_ID);

const stageInstructions: Record<TutorResponseStage, string> = {
  guide:
    "STAGE: GUIDE QUESTION. Ask one focused guiding question first. Do not reveal the answer yet. Keep to 3-5 short sentences.",
  hint:
    "STAGE: STRUCTURED HINT. The student seems stuck once. Give a compact hint, then ask the next guiding question. Do not reveal the full solution yet.",
  reveal:
    "STAGE: CONCISE REVEAL. The student appears stuck after 2 attempts. Provide a brief worked solution, then ask a checkpoint question."
};

export const inferFailedAttempts = (messages: ChatMessage[]): number => {
  const userTurns = messages.reduce((count, message) => (message.role === "user" ? count + 1 : count), 0);
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
}): string => {
  const { context, failedAttempts } = params;
  const stage = getTutorResponseStage(failedAttempts);

  return [
    "You are an AI tutor for Pakistani 9th/10th grade students.",
    "Use the Socratic method with controlled reveal policy.",
    "",
    "Core rules:",
    "- Keep responses concise: 3-5 sentences max.",
    "- Use simple English for a 14-16 year old student.",
    "- Be warm, patient, encouraging, and precise.",
    "- If a formula is relevant, ask the student to recall it before applying it.",
    "- If the student is correct, praise briefly and move to the next step.",
    "- If the student is incorrect, point out one mistake gently and ask them to try again.",
    "",
    "Controlled reveal policy:",
    "- Attempt 0: guiding question.",
    "- Attempt 1: structured hint, then a guiding question.",
    "- Attempt 2+: concise worked solution, then a checkpoint question.",
    "",
    `Current stage rule: ${stageInstructions[stage]}`,
    "",
    "Chapter context:",
    `- board=${normalizeText(context.board)}`,
    `- grade=${context.grade}`,
    `- subject=${normalizeText(context.subject)}`,
    `- chapter=${normalizeText(context.chapterTitle)}`,
    `- summary=${normalizeText(context.chapterSummary)}`,
    context.focusExerciseQuestion ? `- focus_exercise=${normalizeText(context.focusExerciseQuestion)}` : "- focus_exercise=none"
  ].join("\n");
};
