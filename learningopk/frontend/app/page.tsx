import Link from "next/link";
import { Badge } from "@/components/ui";
import { GraduationCap } from "lucide-react";

import { HeroSection } from "./_landing/hero-section";
import { StatsBar } from "./_landing/stats-bar";
import { FeaturesGrid } from "./_landing/features-grid";
import { BoardsSection } from "./_landing/boards-section";

/* ═══════════════════════════════════════════════════════════════
   LearningoPK Landing Page — Server Component
   ═══════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    iconName: "BookOpen" as const,
    title: "Board-Specific Content",
    description:
      "Curated content for Federal, Punjab, and Sindh boards. Every chapter aligned to your exact syllabus.",
  },
  {
    iconName: "Bot" as const,
    title: "AI Tutor",
    description:
      "Get instant help from our AI tutor, available 24/7. Ask anything, get clear explanations.",
  },
  {
    iconName: "BrainCircuit" as const,
    title: "Smart Quizzes",
    description:
      "Adaptive quizzes that focus on your weak areas. The more you practice, the smarter they get.",
  },
  {
    iconName: "TrendingUp" as const,
    title: "Progress Tracking",
    description:
      "Track your learning journey with detailed analytics. See exactly where you stand.",
  },
  {
    iconName: "MessageSquare" as const,
    title: "Community Forum",
    description: "Connect with fellow students and share knowledge. Learn better, together.",
  },
  {
    iconName: "FileCheck" as const,
    title: "Mock Exams",
    description:
      "Practice with past papers and mock examinations. Walk into your exam fully prepared.",
  },
] as const;

const BOARDS = [
  {
    key: "federal",
    name: "Federal Board",
    slug: "fbise",
    subjectCount: 9,
    description: "FBISE curriculum for Islamabad & federal areas",
  },
  {
    key: "punjab",
    name: "Punjab Board",
    slug: "punjab",
    subjectCount: 9,
    description: "BISE Punjab curriculum for all Punjab districts",
  },
  {
    key: "sindh",
    name: "Sindh Board",
    slug: "sindh",
    subjectCount: 8,
    description: "BISE Sindh curriculum for Karachi & Sindh region",
  },
] as const;

const STATS = [
  { value: 10000, suffix: "+", label: "Students", iconName: "Users" as const },
  { value: 3, suffix: "", label: "Boards", iconName: "GraduationCap" as const },
  { value: 500, suffix: "+", label: "Chapters", iconName: "Layers" as const },
  { value: 24, suffix: "/7", label: "AI-Powered Tutor", iconName: "Sparkles" as const },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Stats Bar ── */}
      <StatsBar stats={STATS} />

      {/* ── Features Grid ── */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="primary" size="lg" className="mb-4">
              Everything You Need
            </Badge>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Built for Pakistani Students
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              Every feature designed to help you score higher on your board exams. No fluff, just
              results.
            </p>
          </div>

          <FeaturesGrid features={FEATURES} />
        </div>
      </section>

      {/* ── Boards Section ── */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="primary" size="lg" className="mb-4">
              Your Syllabus, Your Way
            </Badge>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Choose Your Board
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
              Content tailored to your specific board. Every chapter, every topic, exactly as your
              syllabus demands.
            </p>
          </div>

          <BoardsSection boards={BOARDS} />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-default bg-bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-4">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary">
                  <GraduationCap className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                  LearningoPK
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                Board-specific chapter learning with AI tutoring. Pakistan&apos;s smartest study
                platform.
              </p>
            </div>

            {/* About Column */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
                About
              </h4>
              <ul className="mt-4 space-y-3">
                {["Our Story", "Team", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
                Legal
              </h4>
              <ul className="mt-4 space-y-3">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "DMCA"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Column */}
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
                Social
              </h4>
              <ul className="mt-4 space-y-3">
                {["YouTube", "Instagram", "Twitter / X", "Discord"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border-default pt-8 md:flex-row">
            <p className="text-sm text-text-muted">&copy; 2025 LearningoPK. All rights reserved.</p>
            <p className="text-sm text-text-muted">Made with dedication for Pakistani students</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
