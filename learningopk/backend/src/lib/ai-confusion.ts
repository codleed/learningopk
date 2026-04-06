import type { ChatMessage, TutorChapterContext } from "./mistral.js";

export type ConfusionReason =
  | "short_consecutive_messages"
  | "identical_wrong_answers"
  | "off_topic_keywords";

export type ConfusionDetectionResult = {
  triggered: boolean;
  reasons: ConfusionReason[];
};

type DetectConfusionInput = {
  messages: ChatMessage[];
};

const SHORT_MESSAGE_MAX_LENGTH = 14;
const OFF_TOPIC_PATTERNS = [
  /\bjoke\b/i,
  /\bmeme\b/i,
  /\bcricket\b/i,
  /\bfootball\b/i,
  /\bmovie\b/i,
  /\bsong\b/i,
  /\bgame\b/i
];
const WRONG_ANSWER_PATTERNS = [/not quite/i, /try again/i, /incorrect/i, /that's not correct/i, /wrong/i];

const normalize = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const getTrailingShortUserMessageCount = (messages: ChatMessage[]): number => {
  let count = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") {
      continue;
    }

    if (message.content.trim().length >= 1 && message.content.trim().length <= SHORT_MESSAGE_MAX_LENGTH) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
};

const hasRepeatedWrongAnswer = (messages: ChatMessage[]): boolean => {
  for (let index = 0; index < messages.length - 3; index += 1) {
    const firstUser = messages[index + 1];
    const correction = messages[index + 2];
    const secondUser = messages[index + 3];
    const prompt = messages[index];

    if (
      prompt?.role === "assistant" &&
      firstUser?.role === "user" &&
      correction?.role === "assistant" &&
      secondUser?.role === "user"
    ) {
      const first = normalize(firstUser.content);
      const second = normalize(secondUser.content);
      if (first.length > 0 && first === second && WRONG_ANSWER_PATTERNS.some((pattern) => pattern.test(correction.content))) {
        return true;
      }
    }
  }

  return false;
};

const hasOffTopicKeyword = (messages: ChatMessage[]): boolean => {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    return false;
  }

  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(latestUserMessage.content));
};

export const detectConfusionPattern = ({ messages }: DetectConfusionInput): ConfusionDetectionResult => {
  const reasons: ConfusionReason[] = [];

  if (getTrailingShortUserMessageCount(messages) >= 3) {
    reasons.push("short_consecutive_messages");
  }

  if (hasRepeatedWrongAnswer(messages)) {
    reasons.push("identical_wrong_answers");
  }

  if (hasOffTopicKeyword(messages)) {
    reasons.push("off_topic_keywords");
  }

  return {
    triggered: reasons.length > 0,
    reasons
  };
};

export const buildProactiveHint = (topic: string): string =>
  `It looks like you're working through ${topic}. Would you like me to break this down differently?`;

export const getConfusionTopicLabel = (context: TutorChapterContext): string => context.chapterTitle || context.subject || "this topic";
