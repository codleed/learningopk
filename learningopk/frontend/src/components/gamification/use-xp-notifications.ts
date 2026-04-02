"use client";

import { useEffect } from "react";
import type { XpReward } from "@/lib/gamification-types";

export function useXpNotifications(queue: XpReward[], onDismiss: (id: string) => void) {
  useEffect(() => {
    if (queue.length === 0) return;

    const latest = queue[queue.length - 1];

    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [queue, onDismiss]);

  const dismiss = (id: string) => {
    onDismiss(id);
  };

  return { visibleNotifications: queue, dismiss };
}
