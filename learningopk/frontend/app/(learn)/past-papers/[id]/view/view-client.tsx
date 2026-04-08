"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  AlertCircle
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { SubjectBadge } from "@/components/common/subject-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  getMockExam,
  type MockExamDetail
} from "@/lib/mock-exams-api";

interface PastPaperViewClientProps {
  examId: number;
}

export function PastPaperViewClient({ examId }: PastPaperViewClientProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "solution" ? "solution" : "paper";

  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"paper" | "solution">(initialTab);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const examData = await getMockExam(examId);
        setExam(examData);
      } catch (err: unknown) {
        console.error("Failed to load past paper:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load past paper. Please try again.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examId]);

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-8 w-64" />
          <Skeleton variant="text" className="h-4 w-48" />
        </div>
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error || !exam) {
    return (
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
          title="Past Paper"
          breadcrumbs={[
            { label: "Learn", href: "/dashboard" },
            { label: "Past Papers", href: "/past-papers" },
            { label: "View" },
          ]}
        />
        <Card variant="elevated" className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger-light">
            <AlertCircle className="h-5 w-5 text-accent-danger" />
          </div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            Unable to Load Paper
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {error || "Paper not found"}
          </p>
          <div className="mt-5">
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

  /* ─── No markdown content ─── */
  if (!exam.paperContent) {
    return (
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
          title={exam.title}
          breadcrumbs={[
            { label: "Learn", href: "/dashboard" },
            { label: "Past Papers", href: "/past-papers" },
            { label: exam.title },
          ]}
        />
        <Card variant="elevated" className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-warning-light">
            <FileText className="h-5 w-5 text-accent-warning" />
          </div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            No Content Available
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            This paper does not have markdown content. It may be a quiz-based mock exam.
          </p>
          <div className="mt-5">
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

  const hasSolution = !!exam.solutionContent;
  const displayContent = activeTab === "solution" && hasSolution
    ? exam.solutionContent
    : exam.paperContent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        sticky
        stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
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
      />

      {/* Tab switcher */}
      {hasSolution && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("paper")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "paper"
                ? "bg-accent-primary text-white"
                : "bg-bg-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            }`}
          >
            <FileText className="h-4 w-4" />
            Paper
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("solution")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "solution"
                ? "bg-accent-primary text-white"
                : "bg-bg-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Solution
          </button>
        </div>
      )}

      {/* Content card */}
      <Card className="p-6 sm:p-8">
        <MarkdownRenderer
          content={displayContent ?? ""}
          className="text-sm leading-relaxed"
        />
      </Card>

      {/* Back button */}
      <div>
        <Link href="/past-papers">
          <Button variant="secondary" iconLeft={<ArrowLeft />}>
            Back to Past Papers
          </Button>
        </Link>
      </div>
    </div>
  );
}
