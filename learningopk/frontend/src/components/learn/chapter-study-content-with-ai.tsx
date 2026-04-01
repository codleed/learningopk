"use client";

import type { ChapterDetailResponse } from "@/lib/learn-api";
import { EmptyState } from "@/components/ui/states";

import { ChapterExercisesWithAi } from "./chapter-exercises-with-ai";
import { FlashcardDeck } from "./flashcard-deck";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { QuizRunner } from "./quiz-runner";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

type ChapterStudyContentWithAiProps = {
  activeTab: ChapterTab;
  chapterId: number;
  chapterTitle: string;
  chapterNumber?: number;
  summary: string;
  subjectName?: string;
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
  chapterNumber,
  summary,
  subjectName,
  exercises,
  flashcards,
  quiz,
  flashcardStorageKey,
  autoOpenAi = false,
  onPromptChange
}: ChapterStudyContentWithAiProps) {
  return (
    <div className="min-w-0">
      {activeTab === "summary" ? (
        <div data-testid="chapter-summary-markdown">
          <MarkdownRenderer content={summary} />
        </div>
      ) : null}

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
          <QuizRunner quiz={quiz} subjectName={subjectName} chapterNumber={chapterNumber} chapterTitle={chapterTitle} />
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
