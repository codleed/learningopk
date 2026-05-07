"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, XCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { PageHeader } from "@/components/common/page-header";
import { ProgressRing } from "@/components/common/progress-ring";
import { getAttemptDetail, type AttemptExercise } from "@/lib/past-papers-api";

export function ResultsClient({ paperId, attemptId }: { paperId: string; attemptId: string }) {
  const paperIdNum = parseInt(paperId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<{
    id: string;
    status: string;
    score: number | null;
    totalMarks: number | null;
    percentage: number | null;
    startedAt: string;
    submittedAt: string | null;
  } | null>(null);
  const [exercises, setExercises] = useState<AttemptExercise[]>([]);
  const [answerMap, setAnswerMap] = useState<Record<number, { answer: unknown; score: number | null; aiFeedback: string | null }>>({});

  useEffect(() => {
    if (isNaN(paperIdNum)) { setError("Invalid paper ID"); setLoading(false); return; }

    const load = async () => {
      try {
        const data = await getAttemptDetail(paperIdNum, attemptId);
        const a = data.attempt;
        setAttempt({
          id: a.id,
          status: a.status,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.percentage,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt ?? null
        });
        setExercises(data.exercises);
        const map: Record<number, { answer: unknown; score: number | null; aiFeedback: string | null }> = {};
        for (const a of data.answers) {
          map[a.exerciseId] = { answer: a.answer, score: a.score, aiFeedback: a.aiFeedback };
        }
        setAnswerMap(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paperIdNum, attemptId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" className="h-8 w-48" />
        <Skeleton variant="rectangular" className="h-48 w-full" />
        <Skeleton variant="rectangular" className="h-32 w-full" />
        <Skeleton variant="rectangular" className="h-32 w-full" />
        <Skeleton variant="rectangular" className="h-32 w-full" />
      </div>
    );
  }

  if (error || !attempt) {
    return <ErrorState title="Cannot load results" description={error ?? "Not found"} />;
  }

  const percentage = attempt.percentage ?? 0;
  const passed = percentage >= 33;

  return (
    <div className="space-y-6">
      <PageHeader
        sticky
        stickyClassName="-mx-3 -mt-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6"
        title="Paper Results"
        subtitle={`Submitted on ${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "—"}`}
        breadcrumbs={[
          { label: "Learn", href: "/dashboard" },
          { label: "Past Papers", href: "/past-papers" },
          { label: "Results" }
        ]}
      />

      <Card className="p-6">
        <div className="flex flex-col items-center gap-4">
          <ProgressRing percentage={percentage} size={128} />

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              {passed
                ? <Trophy className="h-5 w-5 text-accent-success" />
                : <XCircle className="h-5 w-5 text-accent-danger" />}
              <span className={`font-display text-xl font-bold ${passed ? "text-accent-success" : "text-accent-danger"}`}>
                {passed ? "Passed!" : "Keep practicing"}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Score: {attempt.score ?? 0} / {attempt.totalMarks ?? 0} marks
            </p>
          </div>

          <div className="flex gap-3">
            <Link href={`/past-papers/${paperId}/attempt`}>
              <Button size="sm" iconLeft={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </Link>
            <Link href="/past-papers">
              <Button variant="secondary" size="sm" iconLeft={<ArrowLeft className="h-4 w-4" />}>All Papers</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-text-primary">Question Breakdown</h2>
        {exercises.map((ex, idx) => {
          const answerData = answerMap[ex.id];
          const score = answerData?.score ?? 0;
          const maxMarks = ex.marks ?? 1;
          const isCorrect = score >= maxMarks;

          return (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="primary" size="sm">Q{idx + 1}</Badge>
                      <Badge variant="default" size="sm">{ex.type.replace(/_/g, " ")}</Badge>
                      <span className={`text-sm font-semibold ${isCorrect ? "text-accent-success" : "text-accent-danger"}`}>
                        {score}/{maxMarks}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mb-2">{ex.question}</p>
                    {answerData?.answer != null && (
                      <div className="rounded bg-surface-secondary p-3">
                        <p className="text-xs font-medium text-text-secondary mb-1">Your answer:</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {typeof answerData.answer === "string"
                            ? answerData.answer
                            : JSON.stringify(answerData.answer)}
                        </p>
                      </div>
                    )}
                    {answerData?.aiFeedback && (
                      <div className="mt-2 rounded bg-accent-primary-light/10 p-3">
                        <p className="text-xs font-medium text-accent-primary mb-1">AI Feedback:</p>
                        <p className="text-sm text-text-secondary">{answerData.aiFeedback}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    {isCorrect
                      ? <Trophy className="h-5 w-5 text-accent-success" />
                      : <XCircle className="h-5 w-5 text-accent-danger" />}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
