"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type HeroKpiStripProps = {
  currentStreak: number;
  longestStreak: number;
  healthScore: number;
  activeDaysThisWeek: number;
  activeDaysTarget: number;
};

export function HeroKpiStrip({
  currentStreak,
  longestStreak,
  healthScore,
  activeDaysThisWeek,
  activeDaysTarget,
}: HeroKpiStripProps) {
  const prefersReducedMotion = useReducedMotion();
  const progressPercent = Math.min(100, Math.round((activeDaysThisWeek / activeDaysTarget) * 100));

  const cardVariants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1 },
        show: { opacity: 1, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
      };

  return (
    <div
      role="region"
      aria-label="Key performance indicators"
      className="grid gap-4 sm:grid-cols-3"
    >
      {/* Streak Card */}
      <motion.article
        variants={cardVariants}
        initial="hidden"
        animate="show"
        className="group rounded-lg border border-border bg-[--card] p-5 shadow-[var(--shadow-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
        role="article"
        aria-label={`Current streak: ${currentStreak} consecutive days. Longest streak ever: ${longestStreak} days.`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Current streak
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="font-mono text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {currentStreak}
          </p>
          <p className="text-base text-muted-foreground">days</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          longest: {longestStreak} days
        </p>
      </motion.article>

      {/* Health Score Card */}
      <motion.article
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: prefersReducedMotion ? 0 : 0.08 }}
        className="group relative rounded-lg border-2 border-[var(--primary)]/40 bg-[var(--primary-light)] p-5 shadow-[var(--shadow-sm)] transition-all duration-150 hover:shadow-[var(--shadow-md)]"
        style={{
          background: "linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%)",
        }}
        role="article"
        aria-label={`Overall health score: ${healthScore} percent. Based on chapter completion and quiz performance.`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Health score
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="font-mono text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {healthScore}
          </p>
          <p className="text-base text-muted-foreground">%</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={prefersReducedMotion ? { width: `${healthScore}%` } : { width: 0 }}
              animate={{ width: `${healthScore}%` }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
          <span className="text-xs text-muted-foreground">overall</span>
        </div>
      </motion.article>

      {/* Weekly Progress Card */}
      <motion.article
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={{ delay: prefersReducedMotion ? 0 : 0.16 }}
        className="group rounded-lg border border-border bg-[--card] p-5 shadow-[var(--shadow-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
        role="article"
        aria-label={`Weekly progress: ${activeDaysThisWeek} of ${activeDaysTarget} active days. ${progressPercent} percent complete.`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          This week
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="font-mono text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
            {activeDaysThisWeek}/{activeDaysTarget}
          </p>
          <p className="text-base text-muted-foreground">days</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={prefersReducedMotion ? { width: `${progressPercent}%` } : { width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progressPercent}%</span>
        </div>
      </motion.article>
    </div>
  );
}
