"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type ChapterPublishToggleProps = {
  chapterId: number;
  chapterLabel: string;
  isPublished: boolean;
  onComplete: (result: {
    status: "success" | "failed";
    message: string;
    nextPublished: boolean;
  }) => void;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export function ChapterPublishToggle({
  chapterId,
  chapterLabel,
  isPublished,
  onComplete,
}: ChapterPublishToggleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { pushToast } = useToast();
  const nextPublished = !isPublished;

  const runToggle = async () => {
    setIsPending(true);

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/content/chapters/${chapterId}/publish`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            isPublished: nextPublished,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Admin content endpoint returned ${response.status}.`);
      }

      const message = `${nextPublished ? "Published" : "Unpublished"} ${chapterLabel}.`;
      onComplete({
        status: "success",
        message,
        nextPublished,
      });
      pushToast({
        tone: "success",
        title: "Chapter status updated",
        description: message,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Admin content mutation endpoint is unavailable in this backend.";

      onComplete({
        status: "failed",
        message,
        nextPublished: isPublished,
      });
      pushToast({
        tone: "error",
        title: "Chapter status update failed",
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
        variant={isPublished ? "danger" : "secondary"}
        onClick={() => setIsDialogOpen(true)}
      >
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmDialog
        open={isDialogOpen}
        onCancel={() => setIsDialogOpen(false)}
        onConfirm={runToggle}
        danger={isPublished}
        isPending={isPending}
        title={`${isPublished ? "Unpublish" : "Publish"} ${chapterLabel}?`}
        description="This action should be logged for admin audit."
        confirmLabel={isPublished ? "Unpublish" : "Publish"}
      />
    </>
  );
}
