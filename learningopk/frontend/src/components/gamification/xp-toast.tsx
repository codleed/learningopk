"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { XpReward } from "@/lib/gamification-types";

interface XpToastProps {
  notifications: XpReward[];
  onDismiss: (timestamp: number) => void;
}

export function XpToast({ notifications, onDismiss }: XpToastProps) {
  useEffect(() => {
    if (notifications.length === 0) return;
    
    const latest = notifications[notifications.length - 1];
    const timer = setTimeout(() => {
      onDismiss(latest.timestamp);
    }, 3000);

    return () => clearTimeout(timer);
  }, [notifications, onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.timestamp}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg",
              "bg-gradient-to-r from-amber-500 to-yellow-500",
              "text-white"
            )}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 1 }}
            >
              <Star className="h-5 w-5 fill-current" />
            </motion.div>
            <div>
              <p className="font-bold text-lg">+{notification.amount} XP</p>
              <p className="text-xs opacity-90">{notification.reason}</p>
            </div>
            <button
              onClick={() => onDismiss(notification.timestamp)}
              className="ml-2 rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <span className="sr-only">Dismiss</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6z" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
