"use client";

import { useEffect } from "react";

import { trackProgressEvent } from "@/lib/progress-client";

type ChapterProgressTrackerProps = {
  chapterId: number;
};

export function ChapterProgressTracker({ chapterId }: ChapterProgressTrackerProps) {
  useEffect(() => {
    void trackProgressEvent({
      eventType: "chapter_visit",
      chapterId
    });
  }, [chapterId]);

  return null;
}
