"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, FileText } from "@phosphor-icons/react";
import { LoaderCircle } from "lucide-react";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import {
  getMockExam,
  getQuizQuestions,
  type MockExamDetail,
  type QuizQuestion
} from "@/lib/mock-exams-api";

type SolutionsClientProps = {
  mockExamId: number;
};

const answerOptionEntries: Array<{ key: "a" | "b" | "c" | "d"; label: string }> = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" }
];

const getOptionText = (question: QuizQuestion, option: "a" | "b" | "c" | "d"): string => {
  switch (option) {
    case "a":
      return question.optionA;
    case "b":
      return question.optionB;
    case "c":
      return question.optionC;
    case "d":
      return question.optionD;
  }
};

export function SolutionsClient({ mockExamId }: SolutionsClientProps) {
  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [examData, questionsData] = await Promise.all([
          getMockExam(mockExamId),
          getQuizQuestions(mockExamId)
        ]);
        setExam(examData);
        setQuestions(questionsData);
        setError(null);
      } catch (err) {
        console.error("Failed to load solutions:", err);
        setError("Failed to load solutions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [mockExamId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Past Papers", href: "/past-papers" },
            { label: "Solutions" },
          ]}
          className="mb-4"
        />
        <ErrorState
          title="Unable to load solutions"
          description={error || "Mock exam not found."}
        />
        <Link href="/past-papers">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Past Papers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Past Papers", href: "/past-papers" },
          { label: exam.title },
        ]}
        className="mb-4"
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {exam.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{exam.subjectName}</span>
            <span>•</span>
            <span>{exam.boardName}</span>
            <span>•</span>
            <span>Class {exam.grade}</span>
            <span>•</span>
            <span>{exam.year}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {exam.totalMarks} marks
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {exam.durationMinutes} min
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href={`/${exam.boardSlug}/${exam.grade}/${exam.subjectSlug}?tab=quiz&mockExamId=${exam.id}`}>
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Attempt Again
          </Button>
        </Link>
        <Link href="/past-papers">
          <Button variant="ghost">
            Back to Past Papers
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{questions.length} Questions</Badge>
          <Badge variant="info">Read-only Mode</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This is a read-only view showing the correct answers. No timer is running.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {index + 1}
                  {question.chapterTitle && (
                    <span className="ml-2 text-foreground/60">
                      • {question.chapterTitle}
                    </span>
                  )}
                </p>
                <p className="mt-1 font-medium text-foreground">{question.question}</p>
              </div>
              <Badge variant="neutral">{question.marks} marks</Badge>
            </div>

            <div className="mt-4 grid gap-2">
              {answerOptionEntries.map((option) => {
                const isCorrect = question.correctOption === option.key;
                return (
                  <div
                    key={option.key}
                    className={`
                      flex items-center rounded-lg border px-3 py-2 text-sm
                      ${isCorrect
                        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-border bg-card text-muted-foreground"
                      }
                    `}
                  >
                    {isCorrect ? (
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" weight="fill" />
                    ) : (
                      <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-semibold">
                        {option.label}
                      </span>
                    )}
                    <span className="flex-1">{getOptionText(question, option.key)}</span>
                    {isCorrect && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {question.explanation && (
              <div className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-foreground/90">
                <p className="font-semibold">Explanation:</p>
                <p className="mt-1">{question.explanation}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Link href={`/${exam.boardSlug}/${exam.grade}/${exam.subjectSlug}?tab=quiz&mockExamId=${exam.id}`}>
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Attempt This Paper
          </Button>
        </Link>
      </div>
    </div>
  );
}
