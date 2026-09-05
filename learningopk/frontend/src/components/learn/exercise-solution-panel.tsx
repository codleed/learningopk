"use client";

import { Lightbulb } from "lucide-react";

import { ContentRenderer } from "@/components/common/content-renderer";
import { cn } from "@/lib/utils";

type ExerciseSolutionPanelProps = {
  solution: string;
};

export function ExerciseSolutionPanel({ solution }: ExerciseSolutionPanelProps) {
  return (
    <div className="border-t border-border-default px-4 pb-5 pt-4 sm:px-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-accent-warning" aria-hidden />
        <span className="font-[var(--font-display)] text-sm font-semibold text-text-primary">
          Step-by-step Solution
        </span>
      </div>

      {/* Solution content */}
      <div
        className={cn(
          "rounded-lg border border-border-default bg-bg-subtle/50 p-4 sm:p-5",
          "overflow-x-auto"
        )}
      >
        <ContentRenderer content={solution} variant="default" enableMath enableCode enableGfm />
      </div>
    </div>
  );
}
