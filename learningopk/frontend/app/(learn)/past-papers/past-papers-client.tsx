"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  FileText,
  ArrowRight,
  BookOpen,
  Filter,
  X,
  Trophy,
  Loader2,
  ScrollText
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { SubjectBadge } from "@/components/common/subject-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  getMockExamFilters,
  getMockExams,
  getMockExamAttempts,
  type MockExam,
  type FilterOptions,
  type MockExamFilters,
  type QuizAttempt
} from "@/lib/mock-exams-api";

export function PastPapersClient() {
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [attempts, setAttempts] = useState<Map<number, QuizAttempt[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Load initial filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setIsLoading(true);
        const filterOptions = await getMockExamFilters();
        setFilters(filterOptions);
        setError(null);
      } catch (err) {
        console.error("Failed to load filter options:", err);
        setError("Failed to load filter options. Please ensure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFilters();
  }, []);

  // Load exams when filters change
  useEffect(() => {
    const loadExams = async () => {
      try {
        setIsLoadingExams(true);
        const filterParams: MockExamFilters = {};

        if (selectedBoard) {
          const boardId = parseInt(selectedBoard);
          if (!isNaN(boardId) && boardId > 0) filterParams.boardId = boardId;
        }
        if (selectedGrade) filterParams.grade = selectedGrade as "9" | "10";
        if (selectedSubject) {
          const subjectId = parseInt(selectedSubject);
          if (!isNaN(subjectId) && subjectId > 0) filterParams.subjectId = subjectId;
        }
        if (selectedYear) {
          const year = parseInt(selectedYear);
          if (!isNaN(year) && year > 0) filterParams.year = year;
        }

        const examList = await getMockExams(filterParams);
        setExams(examList);

        // Load attempts for each exam to check if solved
        const attemptsMap = new Map<number, QuizAttempt[]>();
        for (const exam of examList) {
          try {
            const examAttempts = await getMockExamAttempts(exam.id);
            if (examAttempts.length > 0) {
              attemptsMap.set(exam.id, examAttempts);
            }
          } catch {
            // Ignore individual attempt fetch errors
          }
        }
        setAttempts(attemptsMap);
      } catch (err) {
        console.error("Failed to load mock exams:", err);
        setError("Failed to load past papers. Please ensure the backend is running.");
      } finally {
        setIsLoadingExams(false);
      }
    };

    loadExams();
  }, [selectedBoard, selectedGrade, selectedSubject, selectedYear]);

  const handleFilterChange = useCallback((setter: (value: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedBoard("");
    setSelectedGrade("");
    setSelectedSubject("");
    setSelectedYear("");
  }, []);

  const hasActiveFilters = selectedBoard || selectedGrade || selectedSubject || selectedYear;

  const activeFilterCount = [selectedBoard, selectedGrade, selectedSubject, selectedYear].filter(Boolean).length;

  // Filter subjects based on selected board
  const filteredSubjects = useMemo(() => {
    if (!filters) return [];
    return filters.subjects;
  }, [filters]);

  // Group exams by year for display
  const examsByYear = useMemo(() => {
    const grouped = new Map<number, MockExam[]>();
    for (const exam of exams) {
      const existing = grouped.get(exam.year) || [];
      existing.push(exam);
      grouped.set(exam.year, existing);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [exams]);

  /* ─── Loading state ─── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-72" />
        </div>
        <Skeleton variant="rectangular" className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  /* ─── Error state (no filters) ─── */
  if (error && !filters) {
    return (
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
          title="Past Papers"
          subtitle="Practice with previous years' exam papers"
          breadcrumbs={[
            { label: "Learn", href: "/dashboard" },
            { label: "Past Papers" },
          ]}
        />
        <ErrorState
          title="Unable to load past papers"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        sticky
        stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
        title="Past Papers"
        subtitle="Practice with previous years' exam papers. Filter by board, grade, subject, and year."
        breadcrumbs={[
          { label: "Learn", href: "/dashboard" },
          { label: "Past Papers" },
        ]}
      />

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-text-secondary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Filters
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="primary" size="sm">{activeFilterCount} active</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">Board</label>
            <Select
              value={selectedBoard}
              onChange={handleFilterChange(setSelectedBoard)}
              aria-label="Filter by board"
              className="!h-10 !text-sm"
            >
              <option value="">All Boards</option>
              {filters?.boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[120px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">Grade</label>
            <Select
              value={selectedGrade}
              onChange={handleFilterChange(setSelectedGrade)}
              aria-label="Filter by grade"
              className="!h-10 !text-sm"
            >
              <option value="">All Grades</option>
              {filters?.grades.map((grade) => (
                <option key={grade} value={grade}>
                  Class {grade}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">Subject</label>
            <Select
              value={selectedSubject}
              onChange={handleFilterChange(setSelectedSubject)}
              aria-label="Filter by subject"
              className="!h-10 !text-sm"
            >
              <option value="">All Subjects</option>
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[100px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">Year</label>
            <Select
              value={selectedYear}
              onChange={handleFilterChange(setSelectedYear)}
              aria-label="Filter by year"
              className="!h-10 !text-sm"
            >
              <option value="">All Years</option>
              {filters?.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              iconLeft={<X />}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      {isLoadingExams ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-sm text-text-secondary">Loading past papers...</p>
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No past papers found"
          description={hasActiveFilters
            ? "Try adjusting your filters to find more papers."
            : "No past papers are available yet. Check back later."}
          action={hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-8">
          {examsByYear.map(([year, yearExams], yearIndex) => (
            <motion.section
              key={year}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: yearIndex * 0.1, duration: 0.35 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-light font-display text-sm font-bold text-accent-primary">
                  {year}
                </span>
                <h2 className="font-display text-xl font-bold text-text-primary">
                  Papers
                </h2>
                <Badge variant="default" size="sm">
                  {yearExams.length} paper{yearExams.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearExams.map((exam, examIndex) => {
                  const examAttempts = attempts.get(exam.id);
                  const hasAttempted = examAttempts && examAttempts.length > 0;
                  const bestScore = hasAttempted
                    ? Math.max(...examAttempts.map(a => (a.score / a.totalMarks) * 100))
                    : null;
                  const hasMarkdownContent = !!exam.paperContent;

                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: yearIndex * 0.1 + examIndex * 0.05 }}
                    >
                      <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:shadow-[var(--shadow-elevated)]">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <BoardBadge board={exam.boardSlug ?? exam.boardName} size="sm" />
                          <SubjectBadge name={exam.subjectName} size="sm" />
                          <Badge variant="default" size="sm">Class {exam.grade}</Badge>
                          {hasMarkdownContent && (
                            <Badge variant="primary" size="sm">
                              <ScrollText className="mr-1 h-3 w-3" />
                              Document
                            </Badge>
                          )}
                        </div>

                        {/* Title & info */}
                        <h3 className="mt-3 font-display text-base font-semibold text-text-primary leading-snug">
                          {exam.title}
                        </h3>

                        {/* Metadata */}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
                          {!hasMarkdownContent && (
                            <>
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {exam.totalMarks} marks
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {exam.durationMinutes} min
                              </span>
                            </>
                          )}
                          {hasMarkdownContent && (
                            <span className="inline-flex items-center gap-1">
                              <ScrollText className="h-3.5 w-3.5" />
                              Markdown paper
                              {exam.solutionContent ? " + solution" : ""}
                            </span>
                          )}
                        </div>

                        {/* Best score indicator (quiz-based only) */}
                        {!hasMarkdownContent && hasAttempted && bestScore !== null && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-success-light px-2.5 py-1.5">
                            <Trophy className="h-3.5 w-3.5 text-accent-success" />
                            <span className="text-xs font-semibold text-accent-success">
                              Best: {bestScore.toFixed(0)}%
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-auto flex gap-2 pt-4">
                          {hasMarkdownContent ? (
                            <>
                              <Link
                                href={`/past-papers/${exam.id}/view`}
                                className="flex-1"
                              >
                                <Button width="full" size="sm" iconRight={<ArrowRight />}>
                                  View Paper
                                </Button>
                              </Link>
                              {exam.solutionContent && (
                                <Link href={`/past-papers/${exam.id}/view?tab=solution`}>
                                  <Button variant="secondary" size="sm" iconLeft={<BookOpen />}>
                                    Solution
                                  </Button>
                                </Link>
                              )}
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/${exam.boardSlug}/${exam.grade}/${exam.subjectSlug}?tab=quiz&mockExamId=${exam.id}`}
                                className="flex-1"
                              >
                                <Button width="full" size="sm" iconRight={<ArrowRight />}>
                                  {hasAttempted ? "Attempt Again" : "Attempt"}
                                </Button>
                              </Link>
                              {hasAttempted && (
                                <Link href={`/past-papers/${exam.id}/solutions`}>
                                  <Button variant="secondary" size="sm" iconLeft={<BookOpen />}>
                                    Solutions
                                  </Button>
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
