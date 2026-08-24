"use client";

import { createContext, useContext } from "react";

import type { ChapterDetailResponse } from "@/lib/learn-api";

// ── Tab type shared across chapter components ──

export type ChapterTab = "summary" | "quick-revision" | "exercises" | "quiz" | "illustration";

// ── Context value ──

export type ChapterContextValue = {
  // Navigation / routing
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
  chapterSlug: string;
  activeTab: ChapterTab;

  // Display names
  boardName: string;
  className: string;
  subjectName: string;
  chapterTitle: string;
  chapterNumber: number;

  // Chapter identifiers
  chapterId: number;

  // Chapter content
  chapterSummary: string;
  chapterSubparts: Array<{
    id: number;
    chapterId: number;
    orderIndex: number;
    heading: string;
    content: string;
  }>;
  chapterRevisionNotes: ChapterDetailResponse["chapter"]["revisionNotes"];
  exercises: ChapterDetailResponse["exercises"];
  quiz: ChapterDetailResponse["quiz"];

  // Optional flags
  autoOpenAi: boolean;
  challengeId?: string;
};

// ── Context ──

const ChapterContext = createContext<ChapterContextValue | null>(null);

// ── Provider ──

export function ChapterProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChapterContextValue;
}) {
  return <ChapterContext.Provider value={value}>{children}</ChapterContext.Provider>;
}

// ── Consumer hook ──

export function useChapter(): ChapterContextValue {
  const ctx = useContext(ChapterContext);
  if (!ctx) {
    throw new Error("useChapter must be used within a <ChapterProvider>");
  }
  return ctx;
}
