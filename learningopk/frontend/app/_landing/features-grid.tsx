"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  TrendingUp,
  MessageSquare,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

import { Card, CardBody } from "@/components/ui";

/* ─── Icon map (resolved client-side to avoid server→client function passing) ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Bot,
  BrainCircuit,
  TrendingUp,
  MessageSquare,
  FileCheck,
};

/* ─── Types ─── */
interface Feature {
  readonly iconName: string;
  readonly title: string;
  readonly description: string;
}

interface FeaturesGridProps {
  features: readonly Feature[];
}

/* ─── Animation variants ─── */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASE,
      delay: i * 0.08,
    },
  }),
};

/* ═══════════════════════════════════════════════════════════════
   Features Grid — 3x2 responsive grid with gradient hover borders
   ═══════════════════════════════════════════════════════════════ */
export function FeaturesGrid({ features }: FeaturesGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, i) => {
        const Icon = ICON_MAP[feature.iconName] ?? BookOpen;

        return (
          <motion.div
            key={feature.title}
            custom={i}
            variants={cardVariant}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {/* 
              Outer wrapper for gradient border on hover.
              On hover, the outer div shows the conic-gradient,
              and the inner card sits 1px inset with a matching rounded radius.
            */}
            <div className="group relative rounded-xl p-px transition-all duration-300 hover:shadow-[var(--shadow-card)]">
              {/* Gradient border (hidden by default, shown on hover) */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "var(--card-gradient)" }}
                aria-hidden="true"
              />

              {/* Card content */}
              <Card variant="bordered" className="relative h-full border-transparent bg-bg-surface">
                <CardBody className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary-light">
                    <Icon className="h-6 w-6 text-accent-primary" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
