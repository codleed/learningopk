"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Users, GraduationCap, Layers, Sparkles, type LucideIcon } from "lucide-react";

/* ─── Icon map (resolved client-side to avoid server→client function passing) ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  GraduationCap,
  Layers,
  Sparkles,
};

/* ─── Types ─── */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

interface Stat {
  readonly value: number;
  readonly suffix: string;
  readonly label: string;
  readonly iconName: string;
}

interface StatsBarProps {
  stats: readonly Stat[];
}

/* ─── Animated counter ─── */
function AnimatedCounter({
  target,
  suffix,
  inView,
}: {
  target: number;
  suffix: string;
  inView: boolean;
}) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, {
    stiffness: 60,
    damping: 30,
    restDelta: 0.5,
  });
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString());

  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (inView) {
      motionVal.set(target);
    }
  }, [inView, target, motionVal]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (spanRef.current) {
        spanRef.current.textContent = v + suffix;
      }
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return (
    <span
      ref={spanRef}
      className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums text-text-primary md:text-4xl"
    >
      0{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Stats Bar — Animated count-up on viewport entry
   ═══════════════════════════════════════════════════════════════ */
export function StatsBar({ stats }: StatsBarProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative z-10 border-y border-border-default bg-bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4 md:py-16">
        {stats.map((stat, i) => {
          const Icon = ICON_MAP[stat.iconName] ?? Users;
          return (
            <motion.div
              key={stat.label}
              className="flex flex-col items-center gap-2 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                ease: EASE,
                delay: i * 0.1,
              }}
            >
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-light">
                <Icon className="h-5 w-5 text-accent-primary" />
              </div>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={isInView} />
              <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
