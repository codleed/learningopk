"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Flame,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui";
import {
  Card,
  CardBody,
} from "@/components/ui";
import { Badge } from "@/components/ui";

/* ─── Shared easing curve ─── */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/* ─── Stagger animation orchestrator ─── */
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE,
    },
  },
};

const fadeSlideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: EASE,
      delay: 0.4,
    },
  },
};

/* ─── Floating card animation for the mockup ─── */
const floatingCard = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: EASE,
      delay: 0.6 + i * 0.12,
    },
  }),
};

/* ═══════════════════════════════════════════════════════════════
   Hero Section — Client Component with Framer Motion animations
   ═══════════════════════════════════════════════════════════════ */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden bg-bg-base"
    >
      {/* ── Dot grid background pattern ── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: backgroundY }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `
              radial-gradient(circle, var(--border-strong) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Radial fade from center — keeps dots subtle at edges */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, transparent 30%, var(--bg-base) 80%)",
          }}
        />
      </motion.div>

      {/* ── Accent glow orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-40 top-1/4 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "var(--accent-primary)" }}
        />
        <div
          className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full opacity-10 blur-[100px]"
          style={{ background: "var(--accent-info)" }}
        />
      </div>

      {/* ── Content ── */}
      <motion.div
        className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16 lg:py-0"
        style={{ opacity: textOpacity }}
      >
        {/* Left — Copy */}
        <motion.div
          className="flex flex-col justify-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeSlideUp}>
            <Badge variant="primary" size="lg" className="mb-6">
              <Zap className="mr-1 h-3 w-3" />
              Pakistan&apos;s #1 Study Platform
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeSlideUp}
            className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.08] tracking-tight text-text-primary md:text-7xl"
          >
            Learn Smarter.
            <br />
            <span className="gradient-text">Score Higher.</span>
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary md:text-xl"
          >
            Pakistan&apos;s smartest study platform. Board-specific chapters, AI
            tutoring, quizzes, and mock exams &mdash; all in one place.
          </motion.p>

          <motion.div
            variants={fadeSlideUp}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link href="/register">
              <Button
                variant="primary"
                size="lg"
                iconRight={<ArrowRight />}
                disableAnimation
              >
                Start Learning Free
              </Button>
            </Link>
            <Link href="/subjects">
              <Button variant="ghost" size="lg" disableAnimation>
                Browse Subjects
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={fadeSlideUp}
            className="mt-10 flex items-center gap-6"
          >
            <div className="flex -space-x-2">
              {[
                "bg-accent-primary",
                "bg-accent-success",
                "bg-accent-warning",
                "bg-accent-info",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-base text-[10px] font-bold text-white ${bg}`}
                >
                  {["S", "A", "M", "Z"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text-secondary">
                10,000+
              </span>{" "}
              students already learning
            </p>
          </motion.div>
        </motion.div>

        {/* Right — Dashboard Mockup */}
        <motion.div
          className="relative flex items-center justify-center"
          variants={fadeSlideRight}
          initial="hidden"
          animate="visible"
        >
          {/* Main dashboard card */}
          <div className="relative w-full max-w-md">
            {/* Gradient glow behind card */}
            <div
              className="absolute -inset-4 rounded-2xl opacity-30 blur-2xl"
              style={{ background: "var(--card-gradient)" }}
              aria-hidden="true"
            />

            <Card
              variant="elevated"
              className="relative overflow-hidden"
            >
              <CardBody className="space-y-5 p-6">
                {/* Mockup Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-text-muted">
                      Welcome back
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                      Your Dashboard
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary-light">
                    <Flame className="h-5 w-5 text-accent-primary" />
                  </div>
                </div>

                {/* Stat Row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Streak",
                      value: "12",
                      suffix: " days",
                      color: "text-accent-warning",
                    },
                    {
                      label: "Quizzes",
                      value: "48",
                      suffix: "",
                      color: "text-accent-success",
                    },
                    {
                      label: "Score",
                      value: "94",
                      suffix: "%",
                      color: "text-accent-primary",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      custom={i}
                      variants={floatingCard}
                      initial="hidden"
                      animate="visible"
                      className="rounded-lg border border-border-default bg-bg-base p-3 text-center"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-1 font-[family-name:var(--font-display)] text-xl font-bold ${stat.color}`}
                      >
                        {stat.value}
                        <span className="text-sm font-medium text-text-muted">
                          {stat.suffix}
                        </span>
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bars */}
                <motion.div
                  custom={3}
                  variants={floatingCard}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {[
                    {
                      subject: "Physics",
                      progress: 78,
                      icon: TrendingUp,
                      color: "#06B6D4",
                    },
                    {
                      subject: "Mathematics",
                      progress: 65,
                      icon: BrainCircuit,
                      color: "#6366F1",
                    },
                    {
                      subject: "Chemistry",
                      progress: 89,
                      icon: BookOpen,
                      color: "#8B5CF6",
                    },
                  ].map((item) => (
                    <div key={item.subject} className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${item.color}1A`,
                          color: item.color,
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-text-primary">
                            {item.subject}
                          </span>
                          <span className="text-xs font-semibold text-text-secondary">
                            {item.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: "0%" }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{
                              duration: 1.2,
                              ease: EASE,
                              delay: 1.0,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* AI Tutor CTA mockup */}
                <motion.div
                  custom={4}
                  variants={floatingCard}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-3 rounded-lg border border-accent-primary/20 bg-accent-primary-light p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary text-white">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-text-primary">
                      AI Tutor Available
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      Ask any question about your syllabus
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent-primary" />
                </motion.div>
              </CardBody>
            </Card>

            {/* Floating notification card */}
            <motion.div
              custom={5}
              variants={floatingCard}
              initial="hidden"
              animate="visible"
              className="absolute -bottom-4 -left-8 z-20 rounded-xl border border-border-default bg-bg-surface p-3 shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-success-light">
                  <TrendingUp className="h-4 w-4 text-accent-success" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">
                    Quiz Passed!
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Physics Ch. 3 &mdash; 92%
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Floating XP card */}
            <motion.div
              custom={6}
              variants={floatingCard}
              initial="hidden"
              animate="visible"
              className="absolute -right-6 -top-3 z-20 rounded-xl border border-border-default bg-bg-surface p-3 shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-warning-light">
                  <Flame className="h-3.5 w-3.5 text-accent-warning" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-accent-warning">
                    +250 XP
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Bottom fade ── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background:
            "linear-gradient(to top, var(--bg-surface), transparent)",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
