"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Book, FileText, Brain, ClipboardList, Layers } from "lucide-react";

export type ContentStat = {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
};

type ContentStatsStripProps = {
  stats: {
    boards: number;
    classes: number;
    subjects: number;
    chapters: number;
    exercises: number;
    quizzes: number;
    flashcardDecks: number;
  };
};

export function ContentStatsStrip({ stats }: ContentStatsStripProps) {
  const statItems: ContentStat[] = [
    {
      id: "boards",
      label: "Boards",
      value: stats.boards,
      icon: <BookOpen className="h-5 w-5" />,
      href: "/admin/content/boards",
    },
    {
      id: "classes",
      label: "Classes",
      value: stats.classes,
      icon: <GraduationCap className="h-5 w-5" />,
      href: "/admin/content/classes",
    },
    {
      id: "subjects",
      label: "Subjects",
      value: stats.subjects,
      icon: <Book className="h-5 w-5" />,
      href: "/admin/content/subjects",
    },
    {
      id: "chapters",
      label: "Chapters",
      value: stats.chapters,
      icon: <FileText className="h-5 w-5" />,
      href: "/admin/content/chapters",
    },
    {
      id: "exercises",
      label: "Exercises",
      value: stats.exercises,
      icon: <Brain className="h-5 w-5" />,
      href: "/admin/content/exercises",
    },
    {
      id: "quizzes",
      label: "Quizzes",
      value: stats.quizzes,
      icon: <ClipboardList className="h-5 w-5" />,
      href: "/admin/content/quizzes",
    },
    {
      id: "flashcardDecks",
      label: "Flash Cards",
      value: stats.flashcardDecks,
      icon: <Layers className="h-5 w-5" />,
      href: "/admin/content/flashcards",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {statItems.map((stat) => (
        <Link
          key={stat.id}
          href={stat.href}
          className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--primary)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
            {stat.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold text-[var(--text-primary)]">
              {stat.value}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {stat.label}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
