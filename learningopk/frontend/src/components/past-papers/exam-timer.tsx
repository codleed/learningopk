"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export function ExamTimer({
  timeLimitSeconds,
  onTimeout,
  startedAt
}: {
  timeLimitSeconds: number;
  onTimeout: () => void;
  startedAt: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, timeLimitSeconds - elapsed);
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeout();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeout]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isWarning = secondsLeft <= 300;

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono ${
      isWarning ? "bg-accent-danger-light text-accent-danger" : "bg-surface-secondary text-text-primary"
    }`}>
      {isWarning ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <span>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
      {isWarning && <span className="text-xs font-medium">Time running out!</span>}
    </div>
  );
}
