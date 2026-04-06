"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchReviewStats, type ReviewStats } from "@/lib/srs-api";

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
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardBody className="flex-1 flex flex-col justify-between gap-4">
          <Skeleton className="h-20 w-full rounded-lg" />
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
        <div className="flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Spaced Repetition
          </h3>
          <Brain className="h-5 w-5 text-accent-primary" aria-hidden />
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-base p-3">
            <span className="text-sm text-text-secondary">Due now</span>
            <Badge
              variant={stats.dueToday > 0 ? "danger" : "success"}
              size="md"
            >
              {stats.dueToday} card{stats.dueToday !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-base p-3">
            <span className="text-sm text-text-secondary">Due this week</span>
            <Badge variant="default" size="md">
              {stats.dueThisWeek}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-base p-3">
            <span className="text-sm text-text-secondary">Total reviewed</span>
            <Badge variant="primary" size="md">
              {stats.totalReviewed}
            </Badge>
          </div>
        </div>

        {stats.dueToday > 0 ? (
          <Link href="/review" className="block">
            <Button
              variant="primary"
              size="md"
              width="full"
              iconRight={<ChevronRight />}
            >
              Review Now ({stats.dueToday})
            </Button>
          </Link>
        ) : (
          <Link href="/review" className="block">
            <Button
              variant="secondary"
              size="md"
              width="full"
              iconRight={<ChevronRight />}
            >
              Review Dashboard
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
