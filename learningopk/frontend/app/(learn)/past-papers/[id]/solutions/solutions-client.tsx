"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { SubjectBadge } from "@/components/common/subject-badge";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getMockExam,
  getQuizQuestions,
  MockExamApiError,
  type MockExamDetail,
  type QuizQuestion
} from "@/lib/mock-exams-api";

interface MockExamSolutionsClientProps {
  examId: number;
}

const optionLabels: Record<string, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D"
};

export function MockExamSolutionsClient({ examId }: MockExamSolutionsClientProps) {
  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [examData, questionsData] = await Promise.all([
          getMockExam(examId),
          getQuizQuestions(examId)
        ]);
        setExam(examData);
        setQuestions(questionsData);
      } catch (err: unknown) {
        if (err instanceof MockExamApiError && (err.status === 403 || err.code === "EXAM_NOT_COMPLETED")) {
          setError("Solutions are only available after you complete the exam. Please attempt the mock exam first.");
        } else {
          console.error("Failed to load mock exam solutions:", err);
          const errorMessage = err instanceof Error ? err.message : "Failed to load solutions. Please try again.";
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examId]);

  const scrollToQuestion = useCallback((index: number) => {
    setActiveQuestion(index);
    const el = document.getElementById(`solution-q-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-52" />
        ))}
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error || !exam) {
    const isAccessDenied = error?.includes("Solutions are only available after you complete");

    return (
      <div className="space-y-6">
        <PageHeader
          title="Solutions"
          breadcrumbs={[
            { label: "Learn", href: "/dashboard" },
            { label: "Past Papers", href: "/past-papers" },
            { label: "Solutions" },
          ]}
        />

        <Card variant="elevated" className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger-light">
            <Lock className="h-5 w-5 text-accent-danger" />
          </div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {isAccessDenied ? "Exam Not Completed" : "Unable to Load Solutions"}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {error || "Exam not found"}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {isAccessDenied && (
              <Link href={`/past-papers/${examId}/attempt`}>
                <Button>Attempt Exam</Button>
              </Link>
            )}
            <Link href="/past-papers">
              <Button variant="secondary" iconLeft={<ArrowLeft />}>
                Back to Past Papers
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={exam.title}
        subtitle={`${exam.year} \u2022 ${exam.boardName} \u2022 Grade ${exam.grade} \u2022 ${exam.subjectName}`}
        breadcrumbs={[
          { label: "Learn", href: "/dashboard" },
          { label: "Past Papers", href: "/past-papers" },
          { label: exam.title },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <BoardBadge board={exam.boardSlug ?? exam.boardName} size="sm" />
            <SubjectBadge name={exam.subjectName} size="sm" />
          </div>
        }
        actions={
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {exam.totalMarks} marks
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {exam.durationMinutes} min
            </span>
          </div>
        }
      />

      {/* Main layout */}
      <div className="flex gap-5">
        {/* Questions list */}
        <div className="min-w-0 flex-1 space-y-4">
          {questions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-text-secondary">
                No questions available for this exam.
              </p>
            </Card>
          ) : (
            questions.map((question, index) => (
              <motion.div
                key={question.id}
                id={`solution-q-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) }}
              >
                <SolutionQuestionCard
                  question={question}
                  index={index}
                  isActive={activeQuestion === index}
                />
              </motion.div>
            ))
          )}
        </div>

        {/* Side navigator (desktop) */}
        {questions.length > 0 && (
          <div className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-4">
              <Card className="p-3">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Questions
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => scrollToQuestion(index)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                        "hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
                        activeQuestion === index
                          ? "bg-accent-primary text-white"
                          : "bg-bg-subtle text-text-secondary border border-border-default"
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                {/* Back to papers */}
                <div className="mt-3 border-t border-border-default pt-3">
                  <Link href="/past-papers">
                    <Button
                      variant="ghost"
                      size="sm"
                      width="full"
                      iconLeft={<ArrowLeft />}
                    >
                      Back to Papers
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Mobile back button */}
      <div className="lg:hidden">
        <Link href="/past-papers">
          <Button variant="secondary" width="full" iconLeft={<ArrowLeft />}>
            Back to Past Papers
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Solution Question Card ─── */

function SolutionQuestionCard({
  question,
  index,
  isActive,
}: {
  question: QuizQuestion;
  index: number;
  isActive: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        isActive && "ring-2 ring-accent-primary/30"
      )}
    >
      {/* Header (collapsible) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary/40"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-text-primary">
              Question {index + 1}
            </span>
            {question.chapterTitle && (
              <Badge variant="default" size="sm">
                Ch. {question.chapterNumber}: {question.chapterTitle}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">
            {question.marks} mark{question.marks > 1 ? "s" : ""}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border-default px-5 py-4 space-y-4">
          {/* Question text */}
          <div className="text-sm text-text-primary">
            <ContentRenderer content={question.question} variant="compact" />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["a", "b", "c", "d"] as const).map((option) => {
              const isCorrect = question.correctOption === option;
              const optionKey = `option${option.charAt(0).toUpperCase() + option.slice(1)}` as keyof QuizQuestion;
              const optionText = question[optionKey] as string;

              return (
                <div
                  key={option}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                    isCorrect
                      ? "border-accent-success/30 bg-accent-success-light"
                      : "border-border-default bg-bg-surface"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                      isCorrect
                        ? "bg-accent-success text-white"
                        : "bg-bg-subtle text-text-secondary border border-border-default"
                    )}
                  >
                    {isCorrect ? <Check className="h-3 w-3" /> : optionLabels[option]}
                  </span>
                  <span className={cn(
                    "flex-1",
                    isCorrect ? "font-medium text-accent-success" : "text-text-secondary"
                  )}>
                    {optionText}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {question.explanation && (
            <div className="rounded-lg border border-accent-primary/20 bg-accent-primary-light p-3.5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-primary">
                Explanation
              </p>
              <div className="text-sm text-text-primary">
                <ContentRenderer content={question.explanation} variant="compact" />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
