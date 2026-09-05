"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   ExerciseSectionCard — Accented container for exercise types
   
   Each section gets a unique left-border accent, tinted header,
   and focus-within glow via CSS classes in globals.css.
   
   data-type drives the color: "long" | "short" | "blanks" | "physics"
   data-active highlights the section when it's the selected type
   ═══════════════════════════════════════════════════════════════ */

export type ExerciseSectionType = "long" | "short" | "blanks" | "physics";

export interface ExerciseSectionCardProps {
  /** Which exercise type accent to apply */
  type: ExerciseSectionType;
  /** Whether this section is the active/selected type */
  active?: boolean;
  /** Section content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Accented card wrapper for exercise creation sections.
 *
 * Uses CSS custom properties for theming — see `globals.css` for
 * `.exercise-section-card` styles and per-type accent rules.
 *
 * Content children are staggered in with 50ms delays when the
 * `exercise-section-stagger` class is applied to any inner container.
 */
export function ExerciseSectionCard({
  type,
  active = false,
  children,
  className,
}: ExerciseSectionCardProps) {
  return (
    <div
      data-type={type}
      data-active={active ? "true" : undefined}
      className={cn("exercise-section-card", className)}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ExerciseSectionHeader — Tinted header bar with icon + label
   ═══════════════════════════════════════════════════════════════ */

export interface ExerciseSectionHeaderProps {
  type: ExerciseSectionType;
  /** Lucide icon component rendered at 18x18 */
  icon: ReactNode;
  /** Section title, e.g. "Long Questions" */
  title: string;
  /** Optional badge or action slot on the right */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Section header with accent-tinted background, icon, and title.
 *
 * The icon inherits the section's accent color via inline style
 * using the CSS variable `--exercise-{type}`.
 */
export function ExerciseSectionHeader({
  type,
  icon,
  title,
  trailing,
  className,
}: ExerciseSectionHeaderProps) {
  const iconColorVar = `var(--exercise-${type})`;

  return (
    <div
      data-type={type}
      className={cn(
        "exercise-section-header",
        "flex items-center gap-3 px-5 py-3.5",
        "border-b border-border-default",
        className
      )}
    >
      {/* Icon container — accent-colored */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: `color-mix(in srgb, ${iconColorVar} 15%, transparent)`,
          color: iconColorVar,
        }}
      >
        <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>
      </span>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-text-primary tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>

      {/* Trailing slot (badges, actions, etc.) */}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ExerciseSectionBody — Padded content area with stagger
   ═══════════════════════════════════════════════════════════════ */

export interface ExerciseSectionBodyProps {
  children: ReactNode;
  /** Enable stagger animation on children (default: true) */
  stagger?: boolean;
  className?: string;
}

/**
 * Body content area for an exercise section.
 *
 * When `stagger` is true (default), direct children animate in
 * sequentially with 50ms delays using the `.exercise-section-stagger`
 * utility class from globals.css.
 */
export function ExerciseSectionBody({
  children,
  stagger = true,
  className,
}: ExerciseSectionBodyProps) {
  return (
    <div className={cn("px-5 py-5 space-y-5", stagger && "exercise-section-stagger", className)}>
      {children}
    </div>
  );
}
