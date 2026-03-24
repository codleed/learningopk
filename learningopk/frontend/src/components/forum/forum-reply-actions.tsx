"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  error: z.string()
});

export const ForumReplyActions = ({
  replyId,
  upvotes,
  viewerVoteType,
  isAcceptedAnswer,
  canMarkAccepted,
  isAuthenticated
}: ForumReplyActionsProps) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!isAuthenticated) {
      setError("Sign in to vote.");
      return;
    }

    setError(null);
    setIsPending(true);
    const response = await fetch(`${backendUrl}/api/forum/replies/${replyId}/vote`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ voteType })
    });
    const responseBody = (await response.json().catch(() => null)) as unknown;
    setIsPending(false);

    if (!response.ok) {
      const parsedError = errorSchema.safeParse(responseBody);
      setError(parsedError.success ? parsedError.data.error : "Vote failed.");
      return;
    }

    router.refresh();
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      setError("Sign in to mark an accepted answer.");
      return;
    }

    setError(null);
    setIsPending(true);
    const response = await fetch(`${backendUrl}/api/forum/replies/${replyId}/accept`, {
      method: "POST",
      credentials: "include"
    });
    const responseBody = (await response.json().catch(() => null)) as unknown;
    setIsPending(false);

    if (!response.ok) {
      const parsedError = errorSchema.safeParse(responseBody);
      setError(parsedError.success ? parsedError.data.error : "Accept answer failed.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => handleVote("upvote")}
          className={[
            "px-2.5 py-1 text-xs",
            viewerVoteType === "upvote"
              ? "border-emerald-700 bg-emerald-100 text-emerald-700"
              : ""
          ].join(" ")}
          size="sm"
          variant="secondary"
        >
          Upvote
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => handleVote("downvote")}
          className={[
            "px-2.5 py-1 text-xs",
            viewerVoteType === "downvote"
              ? "border-rose-700 bg-rose-100 text-rose-700"
              : ""
          ].join(" ")}
          size="sm"
          variant="secondary"
        >
          Downvote
        </Button>
        <span className="text-muted-foreground">Score: {upvotes}</span>

        {isAcceptedAnswer ? (
          <Badge variant="success">Accepted Answer</Badge>
        ) : null}

        {canMarkAccepted && !isAcceptedAnswer ? (
          <Button type="button" disabled={isPending} onClick={handleAccept} size="sm" variant="secondary">
            Mark accepted
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
};
