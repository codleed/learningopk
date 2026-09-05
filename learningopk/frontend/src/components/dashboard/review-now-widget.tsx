"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchReviewStats, type ReviewStats } from "@/lib/srs-api";

/* ------------------------------------------------------------------ */
/*  Stat row                                                           */
/* ------------------------------------------------------------------ */

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base px-3 py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ReviewNowWidget() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const data = await fetchReviewStats();
        if (!cancelled) {
          setStats(data);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card variant="default" className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardBody className="flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardBody>
      </Card>
    );
  }

  if (hasError || !stats) {
    return null;
  }

  // Don't render widget if no cards are in the SRS system at all
  if (stats.totalReviewed === 0 && stats.dueToday === 0 && stats.dueThisWeek === 0) {
    return null;
  }

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
              <Brain className="h-4 w-4 text-accent-primary" aria-hidden />
            </div>
            <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
              Spaced Repetition
            </h3>
          </div>
          {stats.dueToday > 0 && (
            <Badge variant="danger" size="sm">
              {stats.dueToday} due
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          <StatRow label="Due now">
            <Badge variant={stats.dueToday > 0 ? "danger" : "success"} size="sm">
              {stats.dueToday} card{stats.dueToday !== 1 ? "s" : ""}
            </Badge>
          </StatRow>
          <StatRow label="Due this week">
            <Badge variant="default" size="sm">
              {stats.dueThisWeek}
            </Badge>
          </StatRow>
          <StatRow label="Total reviewed">
            <Badge variant="primary" size="sm">
              {stats.totalReviewed}
            </Badge>
          </StatRow>
        </div>

        {stats.dueToday > 0 ? (
          <Link href="/review" className="block">
            <Button variant="primary" size="md" width="full" iconRight={<ArrowRight />}>
              Review Now ({stats.dueToday})
            </Button>
          </Link>
        ) : (
          <Link href="/review" className="block">
            <Button variant="secondary" size="md" width="full" iconRight={<ChevronRight />}>
              Review Dashboard
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
