"use client";

import { X, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AIChatHeaderProps = {
  variant: "sidebar" | "drawer" | "overlay";
  isExpanded?: boolean;
  onHide?: () => void;
  onExpand?: () => void;
  onClose?: () => void;
  className?: string;
};

export function AIChatHeader({
  variant,
  isExpanded = false,
  onHide,
  onExpand,
  onClose,
  className,
}: AIChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between",
        "px-4 py-3.5",
        "border-b border-border-default/50",
        "bg-bg-surface",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {variant === "sidebar" && onHide && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onHide}
            aria-label="Hide AI Tutor"
            className="h-7 w-7 rounded-md p-0 hover:bg-accent-primary/10 hover:text-accent-primary"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <h2 className="text-sm font-semibold text-text-primary">AI Tutor</h2>
      </div>

      <div className="flex items-center gap-1">
        {variant === "sidebar" && onExpand && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExpand}
            aria-label={isExpanded ? "Restore size" : "Expand"}
            className="h-7 w-7 rounded-md p-0 hover:bg-accent-primary/10 hover:text-accent-primary"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}

        {variant !== "sidebar" && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close AI Chat"
            className="h-7 w-7 rounded-md p-0 hover:bg-accent-danger/10 hover:text-accent-danger"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </header>
  );
}
