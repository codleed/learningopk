import Link from "next/link";
import { ArrowRight, Brain, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { LearningPathRecommendation } from "@/lib/learning-path-api";

export type FocusAreaItem = LearningPathRecommendation & {
  title: string;
  href: string;
};

export function FocusAreasWidget({ recommendations }: { recommendations: FocusAreaItem[] }) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent-warning" aria-hidden />
              <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
                Focus Areas
              </h3>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Prioritized from quiz results, practice depth, and AI tutor engagement.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            Top 3
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="flex-1 pt-0">
        <div className="space-y-3">
          {recommendations.slice(0, 3).map((chapter) => (
            <div
              key={chapter.chapterId}
              className="rounded-xl border border-border-default bg-bg-base p-4 transition-all duration-200 hover:border-accent-warning/30 hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">
                      Priority {chapter.priority}
                    </Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {chapter.estimatedTime}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-text-primary leading-snug">
                    {chapter.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                    {chapter.reason}
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-warning/10 text-accent-warning">
                  {chapter.priority === 1 ? <Sparkles className="h-4 w-4" aria-hidden /> : <Brain className="h-4 w-4" aria-hidden />}
                </div>
              </div>

              <div className="mt-4">
                <Link href={chapter.href} className="block">
                  <Button variant="primary" size="sm" width="full" iconRight={<ArrowRight />}>
                    Start practicing
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
