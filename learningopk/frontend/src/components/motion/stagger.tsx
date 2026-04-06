"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

export const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const fadeUpReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

/* ------------------------------------------------------------------ */
/*  Reusable motion wrappers                                           */
/* ------------------------------------------------------------------ */

export interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container that staggers the entrance animation of its children.
 * Automatically disables animations when the user prefers reduced motion.
 */
export function StaggerContainer({
  children,
  className,
}: StaggerContainerProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? undefined : containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface MotionSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section-level fade-up animation wrapper.
 * Automatically disables animations when the user prefers reduced motion.
 */
export function MotionSection({
  children,
  className,
}: MotionSectionProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? fadeUpReduced : fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export interface MotionCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card-level fade-up animation wrapper with a subtle hover lift.
 * Automatically disables animations when the user prefers reduced motion.
 */
export function MotionCard({
  children,
  className,
}: MotionCardProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={reduced ? fadeUpReduced : fadeUp}
      whileHover={
        reduced ? undefined : { y: -4, transition: { duration: 0.2 } }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
