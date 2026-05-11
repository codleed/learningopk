"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Sparkles, X, AlertTriangle, Lightbulb } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadixSelect, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getAiContext,
  updateAiContext,
  removeWeakTopic,
  removeStrongTopic,
  type AiContextData,
} from "@/lib/ai-context-api";

/* ------------------------------------------------------------------ */
/*  Explanation style options                                           */
/* ------------------------------------------------------------------ */

const STYLE_OPTIONS = [
  { value: "balanced", label: "Balanced", description: "Mix of explanation styles" },
  { value: "visual", label: "Visual", description: "Diagrams & visual metaphors" },
  { value: "step-by-step", label: "Step-by-step", description: "Detailed walkthroughs" },
  { value: "examples", label: "Examples", description: "Learn through examples" },
  { value: "analogies", label: "Analogies", description: "Everyday comparisons" },
] as const;

/* ------------------------------------------------------------------ */
/*  Removable topic tag                                                */
/* ------------------------------------------------------------------ */

function TopicTag({
  topic,
  variant,
  onRemove,
}: {
  topic: string;
  variant: "warning" | "success";
  onRemove: (topic: string) => void;
}) {
  return (
    <Badge
      variant={variant}
      size="sm"
      className="group/tag gap-1 pr-1 cursor-default select-none"
    >
      <span className="max-w-[140px] truncate">{topic}</span>
      <button
        type="button"
        onClick={() => onRemove(topic)}
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full",
          "opacity-60 transition-opacity hover:opacity-100",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-current"
        )}
        aria-label={`Remove ${topic}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function AiMemorySkeleton() {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="h-5 w-5" />
          <Skeleton className="h-5 w-44" />
        </div>
      </CardHeader>
      <CardBody className="flex-1 space-y-4 pt-0">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-18 rounded-full" />
            <Skeleton className="h-5 w-22 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function AiMemoryEmpty() {
  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent-primary" aria-hidden />
          <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            AI Tutor Memory
          </h3>
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10">
          <Sparkles className="h-6 w-6 text-accent-primary" aria-hidden />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-text-primary">
            No memory yet
          </p>
          <p className="text-xs text-text-secondary max-w-[220px]">
            Chat with the AI tutor or take quizzes — it&apos;ll learn about you automatically.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AI Memory Card                                                */
/* ------------------------------------------------------------------ */

export function AiMemoryCard() {
  const [context, setContext] = useState<AiContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Fetch context on mount ---- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAiContext();
        if (!cancelled) {
          setContext(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load AI context");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  /* ---- Remove weak topic ---- */
  const handleRemoveWeakTopic = useCallback(async (topic: string) => {
    if (!context) return;
    setContext((prev) =>
      prev ? { ...prev, weakTopics: prev.weakTopics.filter((t) => t !== topic) } : prev
    );
    try {
      await removeWeakTopic(topic);
    } catch {
      setContext((prev) =>
        prev ? { ...prev, weakTopics: [...prev.weakTopics, topic] } : prev
      );
    }
  }, [context]);

  /* ---- Remove strong topic ---- */
  const handleRemoveStrongTopic = useCallback(async (topic: string) => {
    if (!context) return;
    setContext((prev) =>
      prev ? { ...prev, strongTopics: prev.strongTopics.filter((t) => t !== topic) } : prev
    );
    try {
      await removeStrongTopic(topic);
    } catch {
      setContext((prev) =>
        prev ? { ...prev, strongTopics: [...prev.strongTopics, topic] } : prev
      );
    }
  }, [context]);

  /* ---- Update preferred style ---- */
  const handleStyleChange = useCallback(async (style: string) => {
    if (!context) return;
    const prevStyle = context.preferredExplanationStyle;
    setContext((prev) =>
      prev ? { ...prev, preferredExplanationStyle: style } : prev
    );
    try {
      await updateAiContext({ preferredExplanationStyle: style });
    } catch {
      setContext((prev) =>
        prev ? { ...prev, preferredExplanationStyle: prevStyle } : prev
      );
    }
  }, [context]);

  /* ---- Render states ---- */
  if (loading) return <AiMemorySkeleton />;

  if (error) {
    return (
      <Card variant="default" className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent-primary" aria-hidden />
            <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
              AI Tutor Memory
            </h3>
          </div>
        </CardHeader>
        <CardBody className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
          <AlertTriangle className="h-8 w-8 text-text-muted" aria-hidden />
          <p className="text-xs text-text-secondary text-center">
            Could not load AI memory.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (
    !context ||
    (context.weakTopics.length === 0 &&
      context.strongTopics.length === 0 &&
      context.lastConceptsDiscussed.length === 0 &&
      context.preferredExplanationStyle === "balanced")
  ) {
    return <AiMemoryEmpty />;
  }

  const hasWeakTopics = context.weakTopics.length > 0;
  const hasStrongTopics = context.strongTopics.length > 0;
  const hasRecentConcepts = context.lastConceptsDiscussed.length > 0;

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent-primary" aria-hidden />
            <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
              AI Tutor Memory
            </h3>
          </div>
          <Badge variant="primary" size="sm">
            Personalized
          </Badge>
        </div>
      </CardHeader>

      <CardBody className="flex-1 space-y-4 pt-0">
        {/* Weak topics */}
        {hasWeakTopics && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-accent-warning" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Needs Practice
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.weakTopics.map((topic) => (
                <TopicTag
                  key={topic}
                  topic={topic}
                  variant="warning"
                  onRemove={handleRemoveWeakTopic}
                />
              ))}
            </div>
          </div>
        )}

        {/* Strong topics */}
        {hasStrongTopics && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent-success" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Strong Areas
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.strongTopics.map((topic) => (
                <TopicTag
                  key={topic}
                  topic={topic}
                  variant="success"
                  onRemove={handleRemoveStrongTopic}
                />
              ))}
            </div>
          </div>
        )}

        {/* Preferred explanation style */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Explanation Style
          </span>
          <RadixSelect
            value={context.preferredExplanationStyle}
            onValueChange={handleStyleChange}
            placeholder="Choose style…"
          >
            {STYLE_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                description={opt.description}
              >
                {opt.label}
              </SelectItem>
            ))}
          </RadixSelect>
        </div>

        {/* Recent concepts */}
        {hasRecentConcepts && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-accent-primary" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Recently Discussed
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.lastConceptsDiscussed.slice(0, 8).map((concept) => (
                <Badge key={concept} variant="default" size="sm">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
