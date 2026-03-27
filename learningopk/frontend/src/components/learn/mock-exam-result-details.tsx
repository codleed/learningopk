"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PERFORMANCE_EXCELLENT_THRESHOLD, PERFORMANCE_PASS_THRESHOLD } from "@/lib/quiz-constants";

type SectionScore = {
  chapterId: number | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  score: number;
  totalMarks: number;
  questionCount: number;
  correctCount: number;
};

type WeakArea = {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  correctPercentage: number;
  wrongQuestionCount: number;
  totalQuestions: number;
};

type MockExamResultDetailsProps = {
  sectionScores: SectionScore[];
  weakAreas: WeakArea[] | undefined;
};

export function MockExamResultDetails({ sectionScores, weakAreas }: MockExamResultDetailsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Section-wise Scores */}
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Section-wise Performance</h4>
        <div className="space-y-3">
          {sectionScores.map((section, index) => {
            const percentage = section.totalMarks > 0 
              ? Math.round((section.score / section.totalMarks) * 100) 
              : 0;
            
            return (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {section.chapterTitle ?? "General"}
                      {section.chapterNumber && ` (Ch. ${section.chapterNumber})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {section.correctCount}/{section.questionCount} correct
                    </p>
                  </div>
                    <Badge 
                    variant={percentage >= PERFORMANCE_EXCELLENT_THRESHOLD ? "success" : percentage >= PERFORMANCE_PASS_THRESHOLD ? "warning" : "error"}
                  >
                    {percentage}%
                  </Badge>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className={`h-full transition-all ${
                      percentage >= PERFORMANCE_EXCELLENT_THRESHOLD ? "bg-emerald-500" : percentage >= PERFORMANCE_PASS_THRESHOLD ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Score: {section.score}/{section.totalMarks} marks
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weak Areas Recommendation */}
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-semibold text-foreground">
          Weak Areas to Revise
        </h4>
        {weakAreas && weakAreas.length > 0 ? (
          <div className="space-y-3">
            {weakAreas.map((area, index) => (
              <div 
                key={index} 
                className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {area.chapterTitle}
                    {area.chapterNumber > 0 && ` (Ch. ${area.chapterNumber})`}
                  </p>
                  <Badge variant="error">
                    {Math.round(area.correctPercentage)}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {area.wrongQuestionCount} of {area.totalQuestions} questions incorrect.
                  Review this chapter to improve your score.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Great job! No weak areas identified. You scored 70% or above in all sections.
            </p>
          </div>
        )}

        {/* Time Analysis */}
        <div className="mt-4 border-t border-border pt-4">
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Time Management
          </h5>
          <p className="text-sm text-muted-foreground">
            Review your time allocation across sections to optimize your exam strategy.
          </p>
        </div>
      </Card>
    </div>
  );
}
