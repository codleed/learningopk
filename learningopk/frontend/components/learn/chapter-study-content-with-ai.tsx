"use client";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";

import { ChapterExercisesWithAi } from "./chapter-exercises-with-ai";
import { FlashcardDeck } from "./flashcard-deck";
import { MarkdownMathRenderer } from "./markdown-math-renderer";
import { QuizRunner } from "./quiz-runner";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

type ChapterStudyContentWithAiProps = {
  activeTab: ChapterTab;
  chapterId: number;
  chapterTitle: string;
  summary: string;
  exercises: ChapterDetailResponse["exercises"];
  flashcards: ChapterDetailResponse["flashcards"];
  quiz: ChapterDetailResponse["quiz"];
  flashcardStorageKey: string;
  autoOpenAi?: boolean;
  onPromptChange?: (prompt: string) => void;
};

export function ChapterStudyContentWithAi({
  activeTab,
  chapterId,
  chapterTitle,
  summary,
  exercises,
  flashcards,
  quiz,
  flashcardStorageKey,
  autoOpenAi = false,
  onPromptChange
}: ChapterStudyContentWithAiProps) {
  return (
    <div className="min-w-0">
      {activeTab === "summary" ? <MarkdownMathRenderer content={summary} /> : null}

      {activeTab === "exercises" ? (
        <ChapterExercisesWithAi
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          exercises={exercises}
          initialAiOpen={autoOpenAi}
          showSidebar={false}
          onPromptChange={onPromptChange}
        />
      ) : null}

      {activeTab === "flashcards" ? (
        <FlashcardDeck chapterId={chapterId} flashcards={flashcards} storageKey={flashcardStorageKey} />
      ) : null}

      {activeTab === "quiz" ? (
        quiz ? (
          <QuizRunner quiz={quiz} />
        ) : (
          <EmptyState
            title="Quiz unavailable"
            description="This chapter does not have a quiz yet. Continue with summary, exercises, and flashcards."
          />
        )
      ) : null}
    </div>
  );
}
