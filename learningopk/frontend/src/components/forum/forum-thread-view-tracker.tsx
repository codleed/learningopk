"use client";

import { useEffect, useRef } from "react";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type ForumThreadViewTrackerProps = {
  threadId: string;
};

/**
 * Fires a single POST to record a view for this thread on first mount.
 * Decoupled from the server-component GET so that `router.refresh()` after
 * mutations (vote, reply, accept) does NOT inflate view counts.
 */
export function ForumThreadViewTracker({ threadId }: ForumThreadViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    void fetch(`${backendUrl}/api/forum/threads/${threadId}/view`, {
      method: "POST",
      credentials: "include"
    }).catch(() => {
      // View tracking is best-effort; swallow network errors silently.
    });
  }, [threadId]);

  return null;
}
