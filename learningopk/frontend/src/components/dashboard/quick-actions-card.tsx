import Link from "next/link";
import { Brain, Dices, FileText } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuickActionsCardProps {
  firstChapterBasePath: string | null;
}

type AccentTone = "primary" | "info" | "success";

interface ActionTile {
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  tone: AccentTone;
}

/* ------------------------------------------------------------------ */
/*  Accent helpers                                                     */
/* ------------------------------------------------------------------ */

const toneStyles: Record<AccentTone, { circle: string; icon: string }> = {
  primary: {
    circle: "bg-accent-primary-light",
    icon: "text-accent-primary",
  },
  info: {
    circle: "bg-accent-info-light",
    icon: "text-accent-info",
  },
  success: {
    circle: "bg-accent-success-light",
    icon: "text-accent-success",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuickActionsCard({
  firstChapterBasePath,
}: QuickActionsCardProps) {
  const actions: ActionTile[] = [
    {
      label: "Random Quiz",
      description: "Test your knowledge",
      icon: Dices,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=quiz`
        : "/dashboard",
      tone: "primary",
    },
    {
      label: "AI Tutor",
      description: "Get personalized help",
      icon: Brain,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises&ai=1`
        : "/dashboard",
      tone: "info",
    },
    {
      label: "Past Papers",
      description: "Practice real exams",
      icon: FileText,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises`
        : "/dashboard",
      tone: "success",
    },
  ];

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Quick Actions
        </h3>
      </CardHeader>

      <CardBody className="flex-1 pt-0">
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => {
            const tone = toneStyles[action.tone];
            const Icon = action.icon;

            return (
              <Link
                key={action.label}
                href={action.href}
                className={[
                  "group flex flex-col items-center gap-2 rounded-xl p-3",
                  "bg-bg-subtle",
                  "transition-all duration-200 ease-out",
                  "hover:bg-bg-elevated",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50",
                ].join(" ")}
              >
                {/* Icon circle */}
                <span
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    "transition-transform duration-200 ease-out",
                    tone.circle,
                  ].join(" ")}
                >
                  <Icon className={`h-4 w-4 ${tone.icon}`} aria-hidden />
                </span>

                {/* Label + description */}
                <span className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[13px] font-semibold leading-tight text-text-primary">
                    {action.label}
                  </span>
                  <span className="text-[11px] leading-snug text-text-muted">
                    {action.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
