"use client";

import { useEffect, useRef } from "react";
import { useAIChatContext } from "../ai-chat-context";
import type { AIContext } from "../types";

export function useAIContextSync(context: AIContext | null | undefined) {
  const { updateContext } = useAIChatContext();
  const prevContextRef = useRef<AIContext | null | undefined>(null);

  useEffect(() => {
    const prevContext = prevContextRef.current;
    prevContextRef.current = context;

    if (!context) return;
    if (!prevContext) {
      updateContext(context);
      return;
    }

    const hasRelevantChanges =
      prevContext.chapterId !== context.chapterId ||
      prevContext.currentTab !== context.currentTab ||
      prevContext.currentExerciseId !== context.currentExerciseId ||
      prevContext.currentFlashcardIndex !== context.currentFlashcardIndex ||
      prevContext.quizQuestionId !== context.quizQuestionId;

    if (hasRelevantChanges) {
      updateContext(context);
    }
  }, [context, updateContext]);
}
