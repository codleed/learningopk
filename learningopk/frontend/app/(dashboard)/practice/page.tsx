import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Files, Layers, RotateCcw, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/foundation/app-shell";
import { getServerSession } from "@/lib/session";

type PracticeMode = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  meta: string;
};

const PRACTICE_MODES: PracticeMode[] = [
  {
    href: "/subjects",
    icon: Layers,
    title: "Chapter practice",
    description:
      "MCQs, short and long questions, and fill-in-the-blanks — picked chapter by chapter from your board syllabus.",
    meta: "Untimed · instant check · builds subject readiness",
  },
  {
    href: "/past-papers",
    icon: Files,
    title: "Past papers",
    description:
      "Full board papers with the real question mix, attempted under exam timing and marked like the board.",
    meta: "Timed · board-style marking · best before exams",
  },
  {
    href: "/review",
    icon: RotateCcw,
    title: "Review queue",
    description:
      "Flashcards and questions you have already seen, resurfaced today so older chapters stay fresh.",
    meta: "10–15 min · spaced repetition · keeps progress",
  },
];

export default async function PracticePage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell session={session} currentPath="/practice">
      <div className="space-y-6">
        <PageHeader
          title="Practice"
          subtitle="Pick a mode. Each one tells you the time it takes and what it improves before you start."
          breadcrumbs={[
            { label: "Today", href: "/dashboard" },
            { label: "Practice" },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {PRACTICE_MODES.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              className="group flex flex-col rounded-lg border border-border-default bg-bg-surface p-5 shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-primary-light text-accent-primary">
                  <mode.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className="font-[var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-text-primary">
                  {mode.title}
                </h2>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                {mode.description}
              </p>
              <p className="mt-4 border-t border-border-default pt-3 text-xs font-medium text-text-muted">
                {mode.meta}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary">
                Start
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
