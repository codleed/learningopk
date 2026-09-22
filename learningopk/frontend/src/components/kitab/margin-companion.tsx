"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { OverlayFolio, StampButton, Tag } from "@/components/kitab";
import {
  fetchDueCards,
  fetchReviewStats,
  submitReview,
  type DueCard,
  type RecallRating,
} from "@/lib/srs-api";

/* ═══════════════════════════════════════════════════════════════
   MarginCompanion — the AI tutor as a margin note. Ten states
   render as type-only chips; the queue is a paper overlay.
   Replaces the floating orb + panel chat UI.
   ═══════════════════════════════════════════════════════════════ */

type CompanionState =
  | "idle"
  | "listening"
  | "thinking"
  | "drafting"
  | "citing"
  | "answered"
  | "error"
  | "dismissed"
  | "verify-queue"
  | "awaiting-verification";

const STATE_LABEL: Record<CompanionState, string> = {
  idle: "Ask the margin",
  listening: "Listening…",
  thinking: "Thinking…",
  drafting: "Drafting…",
  citing: "Citing sources…",
  answered: "Answered",
  error: "Something failed",
  dismissed: "Dismissed",
  "verify-queue": "Verification queue",
  "awaiting-verification": "Awaiting your check",
};

export function MarginCompanion({ chapterTitle }: { chapterId: number; chapterTitle: string }) {
  const [state, setState] = useState<CompanionState>("idle");
  const [queueOpen, setQueueOpen] = useState(false);

  const stats = useQuery({
    queryKey: ["srs", "stats"],
    queryFn: fetchReviewStats,
  });
  const due = useQuery({
    queryKey: ["srs", "due"],
    queryFn: fetchDueCards,
  });

  const dueCards: DueCard[] = due.data?.dueCards ?? [];

  const rate = async (cardId: number, rating: RecallRating) => {
    setState("drafting");
    try {
      await submitReview(cardId, rating);
      await due.refetch();
      await stats.refetch();
      setState("answered");
    } catch {
      setState("error");
    }
  };

  return (
    <aside className="mt-10 border-t border-hairline pt-6" data-state={state}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip
          label={STATE_LABEL[state]}
          tone={
            state === "idle"
              ? "neutral"
              : state === "answered"
                ? "done"
                : state === "error"
                  ? "danger"
                  : state === "dismissed"
                    ? "cancelled"
                    : state === "verify-queue" || state === "awaiting-verification"
                      ? "warning"
                      : "active"
          }
          onClick={() => setQueueOpen(true)}
        />
        <Tag tone="neutral">{chapterTitle}</Tag>
        {stats.data ? (
          <span className="tnum text-caption text-ink-faint">{stats.data.dueToday} due today</span>
        ) : null}
      </div>

      <OverlayFolio
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        title={`Margin — ${chapterTitle}`}
      >
        {dueCards.length === 0 ? (
          <p className="text-body text-ink-soft">
            The margin is clear — no cards due. Read on, and they&apos;ll return when it&apos;s
            time.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {dueCards.map((card) => (
              <li key={card.reviewId} className="py-3">
                <p className="text-body text-ink">{card.front}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-caption text-brick-deep">
                    Show answer
                  </summary>
                  <p className="mt-2 text-body text-ink-soft">{card.back}</p>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["again", "hard", "good", "easy"] as const).map((r) => (
                    <StampButton
                      key={r}
                      variant={r === "good" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => rate(card.cardId, r)}
                    >
                      {r}
                    </StampButton>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </OverlayFolio>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Chip — the ten-state chip (caps, small, bordered). Lives here
   to avoid a circular barrel import in companion-only usage.
   ═══════════════════════════════════════════════════════════════ */

function Chip({
  label,
  tone = "neutral",
  onClick,
}: {
  label: string;
  tone?: "neutral" | "active" | "warning" | "danger" | "done" | "cancelled";
  onClick?: () => void;
}) {
  const tones = {
    neutral: "bg-paper-dim text-ink-soft",
    active: "bg-accent-tint text-accent-bright",
    /* ponytail: ochre-tint/ochre are value-aliases of warning/warning-tint; --color-warning isn't in @theme */
    warning: "bg-ochre-tint text-ochre",
    danger: "bg-danger-tint text-danger",
    done: "bg-paper-dim text-ink",
    cancelled: "bg-paper-dim text-ink-faint",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      data-tone={tone}
      className={`inline-flex items-center rounded-[6px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {label}
    </button>
  );
}
