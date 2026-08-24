"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type ThreadPinToggleProps = {
  threadId: string;
  threadTitle: string;
  isPinned: boolean;
  onComplete: (result: {
    status: "success" | "failed";
    message: string;
    nextPinned: boolean;
  }) => void;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export function ThreadPinToggle({
  threadId,
  threadTitle,
  isPinned,
  onComplete,
}: ThreadPinToggleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { pushToast } = useToast();
  const nextPinned = !isPinned;

  const runToggle = async () => {
    setIsPending(true);

    try {
      const response = await fetch(`${backendUrl}/api/admin/forum/threads/${threadId}/pin`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isPinned: nextPinned,
        }),
      });

      if (!response.ok) {
        throw new Error(`Admin forum endpoint returned ${response.status}.`);
      }

      const message = `${nextPinned ? "Pinned" : "Unpinned"} thread: ${threadTitle}`;
      onComplete({
        status: "success",
        message,
        nextPinned,
      });
      pushToast({
        tone: "success",
        title: "Thread moderation updated",
        description: message,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Admin forum mutation endpoint is unavailable in this backend.";

      onComplete({
        status: "failed",
        message,
        nextPinned: isPinned,
      });
      pushToast({
        tone: "error",
        title: "Thread moderation failed",
        description: message,
      });
    } finally {
      setIsPending(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={isPinned ? "danger" : "secondary"}
        onClick={() => setIsDialogOpen(true)}
      >
        {isPinned ? "Unpin" : "Pin"}
      </Button>
      <ConfirmDialog
        open={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        onConfirm={runToggle}
        danger={isPinned}
        isPending={isPending}
        title={`${isPinned ? "Unpin" : "Pin"} this thread?`}
        description={threadTitle}
        confirmLabel={isPinned ? "Unpin thread" : "Pin thread"}
      />
    </>
  );
}
