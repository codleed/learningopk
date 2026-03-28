"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Clock, FileText, CheckCircle, ArrowRight, BookOpen } from "@phosphor-icons/react";
import { LoaderCircle } from "lucide-react";

import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

        if (selectedBoard) filterParams.boardId = parseInt(selectedBoard);
        if (selectedGrade) filterParams.grade = selectedGrade as "9" | "10";
        if (selectedSubject) filterParams.subjectId = parseInt(selectedSubject);
        if (selectedYear) filterParams.year = parseInt(selectedYear);

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

  // Filter subjects based on selected board
  const filteredSubjects = useMemo(() => {
    if (!filters) return [];
    // Show all subjects when no board is selected, or filter by board
    return filters.subjects;
  }, [filters, selectedBoard]);

  // Group exams by year for display
  const examsByYear = useMemo(() => {
    const grouped = new Map<number, MockExam[]>();
    for (const exam of exams) {
      const existing = grouped.get(exam.year) || [];
      existing.push(exam);
      grouped.set(exam.year, existing);
    }
    // Sort years in descending order
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [exams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !filters) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Learn", href: "/dashboard" },
            { label: "Past Papers" },
          ]}
          className="mb-4"
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
      <Breadcrumbs
        items={[
          { label: "Learn", href: "/dashboard" },
          { label: "Past Papers" },
        ]}
        className="mb-4"
      />

      <div>
        <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.4rem]">
          Past Papers Archive
        </h1>
        <p className="mt-3 text-sm text-foreground/60">
          Practice with previous years&apos; exam papers. Filter by board, grade, subject, and year.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="min-w-[140px]">
              <Select
                value={selectedBoard}
                onChange={handleFilterChange(setSelectedBoard)}
                aria-label="Filter by board"
              >
                <option value="">All Boards</option>
                {filters?.boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="min-w-[120px]">
              <Select
                value={selectedGrade}
                onChange={handleFilterChange(setSelectedGrade)}
                aria-label="Filter by grade"
              >
                <option value="">All Grades</option>
                {filters?.grades.map((grade) => (
                  <option key={grade} value={grade}>
                    Class {grade}
                  </option>
                ))}
              </Select>
            </div>

            <div className="min-w-[160px]">
              <Select
                value={selectedSubject}
                onChange={handleFilterChange(setSelectedSubject)}
                aria-label="Filter by subject"
              >
                <option value="">All Subjects</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="min-w-[100px]">
              <Select
                value={selectedYear}
                onChange={handleFilterChange(setSelectedYear)}
                aria-label="Filter by year"
              >
                <option value="">All Years</option>
                {filters?.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoadingExams ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No past papers found"
          description={hasActiveFilters 
            ? "Try adjusting your filters to find more papers." 
            : "No past papers are available yet. Check back later."}
        />
      ) : (
        <div className="space-y-8">
          {examsByYear.map(([year, yearExams]) => (
            <section key={year}>
              <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">
                  {year}
                </span>
                Papers
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearExams.map((exam) => {
                  const examAttempts = attempts.get(exam.id);
                  const hasAttempted = examAttempts && examAttempts.length > 0;
                  const bestScore = hasAttempted 
                    ? Math.max(...examAttempts.map(a => (a.score / a.totalMarks) * 100))
                    : null;

                  return (
                    <article
                      key={exam.id}
                      className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge variant="neutral">{exam.year}</Badge>
                            <Badge variant="info">Class {exam.grade}</Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {exam.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {exam.subjectName} - {exam.boardName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {exam.totalMarks} marks
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {exam.durationMinutes} min
                        </span>
                      </div>

                      {hasAttempted && bestScore !== null && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                          <span className="text-green-600 dark:text-green-400">
                            Best: {bestScore.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/${exam.boardSlug}/${exam.grade}/${exam.subjectSlug}?tab=quiz&mockExamId=${exam.id}`}
                          className="flex-1"
                        >
                          <Button className="w-full">
                            {hasAttempted ? "Attempt Again" : "Attempt"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        {hasAttempted && (
                          <Link href={`/past-papers/${exam.id}/solutions`}>
                            <Button variant="secondary">
                              <BookOpen className="mr-2 h-4 w-4" />
                              View Solutions
                            </Button>
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
