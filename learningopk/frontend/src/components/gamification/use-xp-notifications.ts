"use client";

import { useEffect, useState } from "react";
import type { XpReward } from "@/lib/gamification-types";

export function useXpNotifications(queue: XpReward[], onDismiss: (timestamp: number) => void) {
  const [visibleNotifications, setVisibleNotifications] = useState<XpReward[]>([]);

  useEffect(() => {
    if (queue.length === 0) return;
    
    const latest = queue[queue.length - 1];
    setVisibleNotifications((prev) => {
      if (prev.some((n) => n.timestamp === latest.timestamp)) return prev;
      return [...prev, latest];
    });

    const timer = setTimeout(() => {
      onDismiss(latest.timestamp);
    }, 3000);

    return () => clearTimeout(timer);
  }, [queue, onDismiss]);

  const dismiss = (timestamp: number) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
    onDismiss(timestamp);
  };

  return { visibleNotifications, dismiss };
}
