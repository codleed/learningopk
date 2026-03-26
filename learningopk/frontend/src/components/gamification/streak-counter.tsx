"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  if (streak === 0) return null;

  const getStreakColor = () => {
    if (streak >= 30) return "text-red-500";
    if (streak >= 14) return "text-orange-500";
    if (streak >= 7) return "text-amber-500";
    return "text-yellow-500";
  };

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "bg-gradient-to-r from-orange-100 to-red-100",
        "dark:from-orange-900/30 dark:to-red-900/30",
        className
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Flame className={cn("h-4 w-4", getStreakColor())} />
      </motion.div>
      <span className={cn("text-sm font-bold", getStreakColor())}>{streak}</span>
    </motion.div>
  );
}
