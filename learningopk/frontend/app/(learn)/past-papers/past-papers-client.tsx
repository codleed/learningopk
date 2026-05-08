"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Filter, X, Eye, Play, UserCircle } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { BoardBadge } from "@/components/common/board-badge";
import { SubjectBadge } from "@/components/common/subject-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getPastPapers, PastPaperApiError, type PastPaper } from "@/lib/past-papers-api";

export function PastPapersClient() {
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incompleteProfile, setIncompleteProfile] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  useEffect(() => {
    const loadPapers = async () => {
      try {
        setIsLoading(true);
        const params: Record<string, number> = {};
        if (selectedSubject) {
          const sid = parseInt(selectedSubject);
          if (!isNaN(sid) && sid > 0) params.subjectId = sid;
        }
        if (selectedYear) {
          const y = parseInt(selectedYear);
          if (!isNaN(y) && y > 0) params.year = y;
        }

        const result = await getPastPapers(params);
        setPapers(result.data);
        setError(null);
        setIncompleteProfile(false);
      } catch (err) {
        if (err instanceof PastPaperApiError && (err.code === "INCOMPLETE_PROFILE" || err.code === "INVALID_CLASS")) {
          setIncompleteProfile(true);
          setError(null);
        } else {
          console.error("Failed to load past papers:", err);
          setError("Failed to load past papers. Please ensure the backend is running.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPapers();
  }, [selectedSubject, selectedYear]);

  const handleFilterChange = useCallback((setter: (value: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedSubject("");
    setSelectedYear("");
  }, []);

  const hasActiveFilters = !!(selectedSubject || selectedYear);
  const activeFilterCount = [selectedSubject, selectedYear].filter(Boolean).length;

  const examsByYear = useMemo(() => {
    const grouped = new Map<number, PastPaper[]>();
    for (const paper of papers) {
      const existing = grouped.get(paper.year) || [];
      existing.push(paper);
      grouped.set(paper.year, existing);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [papers]);

  const availableSubjects = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of papers) {
      if (!map.has(p.subjectId)) map.set(p.subjectId, p.subjectName);
    }
    return Array.from(map.entries());
  }, [papers]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const p of papers) years.add(p.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [papers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-72" />
        </div>
        <Skeleton variant="rectangular" className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (incompleteProfile) {
    return (
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
          title="Past Papers"
          subtitle="Practice with previous years' exam papers"
          breadcrumbs={[{ label: "Learn", href: "/dashboard" }, { label: "Past Papers" }]}
        />
        <Card className="p-8 text-center">
          <UserCircle className="mx-auto mb-4 h-12 w-12 text-text-secondary" />
          <h3 className="font-display text-lg font-semibold text-text-primary">Complete Your Profile</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-text-secondary">
            To access past papers, please set your class and board in your profile settings.
            This helps us show you the right papers for your curriculum.
          </p>
          <div className="mt-4">
            <Link href="/settings">
              <Button size="sm" iconRight={<UserCircle className="h-4 w-4" />}>
                Go to Settings
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
          title="Past Papers"
          subtitle="Practice with previous years' exam papers"
          breadcrumbs={[{ label: "Learn", href: "/dashboard" }, { label: "Past Papers" }]}
        />
        <ErrorState title="Unable to load past papers" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
        title="Past Papers"
        subtitle="View and attempt past exam papers for your class and board."
        breadcrumbs={[{ label: "Learn", href: "/dashboard" }, { label: "Past Papers" }]}
      />

      {papers.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-text-secondary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Filters</span>
            {activeFilterCount > 0 && <Badge variant="primary" size="sm">{activeFilterCount} active</Badge>}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Subject</label>
              <Select value={selectedSubject} onChange={handleFilterChange(setSelectedSubject)} aria-label="Filter by subject" className="!h-10 !text-sm">
                <option value="">All Subjects</option>
                {availableSubjects.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </Select>
            </div>
            <div className="min-w-[100px] flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Year</label>
              <Select value={selectedYear} onChange={handleFilterChange(setSelectedYear)} aria-label="Filter by year" className="!h-10 !text-sm">
                <option value="">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} iconLeft={<X />}>Clear</Button>
            )}
          </div>
        </Card>
      )}

      {papers.length === 0 ? (
        <EmptyState
          title="No past papers found"
          description="No past papers are available for your class and board yet."
        />
      ) : (
        <div className="space-y-8">
          {examsByYear.map(([year, yearPapers], yearIndex) => (
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
                <h2 className="font-display text-xl font-bold text-text-primary">Papers</h2>
                <Badge variant="default" size="sm">{yearPapers.length} paper{yearPapers.length !== 1 ? "s" : ""}</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {yearPapers.map((paper, paperIndex) => {
                  const hasMarkdownContent = !!paper.paperContent;
                  const hasExercises = (paper.exerciseCount ?? 0) > 0;

                  return (
                    <motion.div
                      key={paper.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: yearIndex * 0.1 + paperIndex * 0.05 }}
                    >
                      <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:shadow-[var(--shadow-elevated)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <BoardBadge board={paper.boardSlug ?? paper.boardName} size="sm" />
                          <SubjectBadge name={paper.subjectName} size="sm" />
                          <Badge variant="default" size="sm">Class {paper.grade}</Badge>
                          {hasMarkdownContent && <Badge variant="primary" size="sm">Paper</Badge>}
                          {hasExercises && <Badge variant="success" size="sm">{paper.exerciseCount} exercises</Badge>}
                        </div>

                        <h3 className="mt-3 font-display text-base font-semibold text-text-primary leading-snug">{paper.title}</h3>

                        {paper.description && (
                          <p className="mt-1 text-xs text-text-secondary line-clamp-2">{paper.description}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {paper.durationMinutes} min
                          </span>
                        </div>

                        <div className="mt-auto flex gap-2 pt-4">
                          {hasMarkdownContent && (
                            <Link href={`/past-papers/${paper.id}/view`} className="flex-1">
                              <Button width="full" size="sm" variant="secondary" iconLeft={<Eye className="h-4 w-4" />}>
                                View
                              </Button>
                            </Link>
                          )}
                          {hasExercises && (
                            <Link href={`/past-papers/${paper.id}/attempt`} className="flex-1">
                              <Button width="full" size="sm" iconRight={<Play className="h-4 w-4" />}>
                                Attempt
                              </Button>
                            </Link>
                          )}
                          {!hasMarkdownContent && !hasExercises && (
                            <Button width="full" size="sm" disabled>
                              Coming Soon
                            </Button>
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
