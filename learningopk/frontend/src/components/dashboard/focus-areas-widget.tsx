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

function PriorityDot({ priority }: { priority: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={
            dot <= priority
              ? "h-1.5 w-1.5 rounded-full bg-accent-warning"
              : "h-1.5 w-1.5 rounded-full bg-bg-subtle"
          }
        />
      ))}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-warning/10">
              <Target className="h-4 w-4 text-accent-warning" aria-hidden />
            </div>
            <div>
              <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
                Focus Areas
              </h3>
              <p className="text-[11px] text-text-muted">
                Prioritized by quiz + practice data
              </p>
            </div>
          </div>
          <Badge variant="warning" size="sm">
            Top {Math.min(recommendations.length, 3)}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="flex-1 pt-0">
        <div className="space-y-2.5">
          {recommendations.slice(0, 3).map((chapter) => (
            <Link
              key={chapter.chapterId}
              href={chapter.href}
              className="group block"
            >
              <div className="rounded-2xl border border-border-default bg-bg-base p-3.5 transition-all duration-200 hover:border-accent-warning/30 hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-warning/10 text-accent-warning">
                    {chapter.priority === 1 ? (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    ) : (
                      <Brain className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={chapter.priority} />
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
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" aria-hidden />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
