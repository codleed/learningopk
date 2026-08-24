import Link from "next/link";
import { ArrowRight, Brain, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { LearningPathRecommendation } from "@/lib/learning-path-api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FocusAreaItem = LearningPathRecommendation & {
  title: string;
  href: string;
};

/* ------------------------------------------------------------------ */
/*  Priority indicator                                                 */
/* ------------------------------------------------------------------ */

function PriorityBar({ priority }: { priority: number }) {
  const width = priority === 1 ? "33%" : priority === 2 ? "66%" : "100%";
  return (
    <div className="h-1 w-8 rounded-full bg-bg-subtle overflow-hidden">
      <div className="h-full rounded-full bg-accent-warning" style={{ width }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FocusAreasWidget({ recommendations }: { recommendations: FocusAreaItem[] }) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-warning/10">
              <Target className="h-4 w-4 text-accent-warning" aria-hidden />
            </div>
            <div>
              <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
                Focus Areas
              </h3>
              <p className="text-[11px] text-text-muted">Prioritized by quiz + practice data</p>
            </div>
          </div>
          <Badge variant="warning" size="sm">
            Top {Math.min(recommendations.length, 3)}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="flex-1 pt-0">
        <div className="space-y-2">
          {recommendations.slice(0, 3).map((chapter) => (
            <Link key={chapter.chapterId} href={chapter.href} className="group block">
              <div className="rounded-xl border border-border-default bg-bg-base p-3 transition-all duration-200 hover:border-accent-warning/30 hover:shadow-[var(--shadow-sm)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-warning/10 text-accent-warning">
                    {chapter.priority === 1 ? (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    ) : (
                      <Brain className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PriorityBar priority={chapter.priority} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {chapter.estimatedTime}
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-semibold text-text-primary leading-snug">
                      {chapter.title}
                    </h4>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {chapter.reason}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
