"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  TextCursorInput,
  Atom,
} from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ExerciseSectionType } from "./exercise-section-card";

/* ═══════════════════════════════════════════════════════════════
   ExerciseTypeTabs — Horizontal tab bar for exercise type selection
   
   Each tab shows an icon + label colored with the section accent.
   The active tab has a sliding indicator (Framer Motion layoutId)
   and an accent-tinted background.
   ═══════════════════════════════════════════════════════════════ */

type TabConfig = {
  type: ExerciseSectionType;
  label: string;
  icon: ReactNode;
  accentVar: string;
};

const TAB_CONFIG: TabConfig[] = [
  {
    type: "long",
    label: "Long Questions",
    icon: <FileText />,
    accentVar: "--exercise-long",
  },
  {
    type: "short",
    label: "Short Questions",
    icon: <MessageSquare />,
    accentVar: "--exercise-short",
  },
  {
    type: "blanks",
    label: "Fill in the Blanks",
    icon: <TextCursorInput />,
    accentVar: "--exercise-blanks",
  },
  {
    type: "physics",
    label: "Physics Problems",
    icon: <Atom />,
    accentVar: "--exercise-physics",
  },
];

export interface ExerciseTypeTabsProps {
  /** Currently active exercise type */
  value: ExerciseSectionType;
  /** Callback when the user selects a different type */
  onValueChange: (type: ExerciseSectionType) => void;
  /** Additional class names on the outer container */
  className?: string;
}

/**
 * Exercise type tab bar with accent-colored indicators.
 * 
 * Features:
 * - Framer Motion `layoutId` for smooth sliding background
 * - Per-tab accent color from CSS variables
 * - Active scale(0.97) press animation on buttons
 * - Responsive: scrolls horizontally if needed
 * - Keyboard accessible (native button focus management)
 */
export function ExerciseTypeTabs({
  value,
  onValueChange,
  className,
}: ExerciseTypeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Exercise type"
      className={cn(
        "flex gap-1 rounded-xl bg-bg-subtle/50 p-1",
        "border border-border-default",
        "overflow-x-auto scrollbar-thin",
        className,
      )}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = value === tab.type;
        const accentColor = `var(${tab.accentVar})`;

        return (
          <button
            key={tab.type}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`exercise-panel-${tab.type}`}
            onClick={() => onValueChange(tab.type)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "text-sm font-medium whitespace-nowrap",
              "transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
              "active:scale-[0.97]",
              isActive
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {/* Animated background indicator */}
            {isActive && (
              <motion.span
                layoutId="exercise-type-tab-bg"
                className="absolute inset-0 rounded-lg bg-bg-surface shadow-[var(--shadow-sm)]"
                style={{
                  borderLeft: `2px solid ${accentColor}`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}

            {/* Icon */}
            <span
              className={cn(
                "relative z-10 [&>svg]:h-4 [&>svg]:w-4 transition-colors duration-150",
              )}
              style={{ color: isActive ? accentColor : undefined }}
            >
              {tab.icon}
            </span>

            {/* Label */}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
