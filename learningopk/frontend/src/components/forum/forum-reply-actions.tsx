"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, CheckCircle, Award } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type ForumReplyActionsProps = {
  replyId: string;
  upvotes: number;
  viewerVoteType: "upvote" | "downvote" | null;
  isAcceptedAnswer: boolean;
  canMarkAccepted: boolean;
  isAuthenticated: boolean;
};

const errorSchema = z.object({
  error: z.string(),
});

export const ForumReplyActions = ({
  replyId,
  upvotes,
  viewerVoteType,
  isAcceptedAnswer,
  canMarkAccepted,
  isAuthenticated,
}: ForumReplyActionsProps) => {
  const router = useRouter();
  const { pushToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!isAuthenticated) {
      setError("Sign in to vote.");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const response = await fetch(`${backendUrl}/api/forum/replies/${replyId}/vote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const parsedError = errorSchema.safeParse(responseBody);
        setError(parsedError.success ? parsedError.data.error : "Vote failed.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      pushToast({
        title: "Vote failed",
        description: "The server could not be reached. Please try again.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      setError("Sign in to mark an accepted answer.");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      const response = await fetch(`${backendUrl}/api/forum/replies/${replyId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        const parsedError = errorSchema.safeParse(responseBody);
        setError(parsedError.success ? parsedError.data.error : "Accept answer failed.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      pushToast({
        title: "Accept answer failed",
        description: "The server could not be reached. Please try again.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Upvote button */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleVote("upvote")}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150",
            "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
            "disabled:pointer-events-none disabled:opacity-50",
            viewerVoteType === "upvote"
              ? "border-accent-success/30 bg-accent-success-light text-accent-success"
              : "border-border-default bg-bg-subtle text-text-secondary hover:border-accent-success/30 hover:text-accent-success"
          )}
          aria-label="Upvote"
          aria-pressed={viewerVoteType === "upvote"}
        >
          <ThumbsUp className="h-3 w-3" aria-hidden="true" />
          <span>Upvote</span>
        </button>

        {/* Score */}
        <span
          className={cn(
            "px-1.5 text-xs font-bold tabular-nums",
            upvotes > 0
              ? "text-accent-success"
              : upvotes < 0
                ? "text-accent-danger"
                : "text-text-muted"
          )}
        >
          {upvotes > 0 ? `+${upvotes}` : upvotes}
        </span>

        {/* Downvote button */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleVote("downvote")}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150",
            "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
            "disabled:pointer-events-none disabled:opacity-50",
            viewerVoteType === "downvote"
              ? "border-accent-danger/30 bg-accent-danger-light text-accent-danger"
              : "border-border-default bg-bg-subtle text-text-secondary hover:border-accent-danger/30 hover:text-accent-danger"
          )}
          aria-label="Downvote"
          aria-pressed={viewerVoteType === "downvote"}
        >
          <ThumbsDown className="h-3 w-3" aria-hidden="true" />
        </button>

        {/* Separator */}
        <span className="h-4 w-px bg-border-default" aria-hidden="true" />

        {/* Accept answer button */}
        {canMarkAccepted && !isAcceptedAnswer ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleAccept}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150",
              "border border-border-default bg-bg-subtle text-text-secondary",
              "hover:border-accent-success/30 hover:bg-accent-success-light hover:text-accent-success",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
            aria-label="Mark as accepted answer"
          >
            <Award className="h-3 w-3" aria-hidden="true" />
            <span>Accept</span>
          </button>
        ) : null}
      </div>

      {/* Error */}
      {error ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-accent-danger"
        >
          {error}
        </motion.p>
      ) : null}
    </div>
  );
};
