import Link from "next/link";
import { Brain, Dices, FileText } from "lucide-react";

import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface QuickActionsCardProps {
  firstChapterBasePath: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuickActionsCard({
  firstChapterBasePath,
}: QuickActionsCardProps) {
  const actions = [
    {
      label: "Start Random Quiz",
      description: "Test your knowledge",
      icon: Dices,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=quiz`
        : "/dashboard",
      variant: "primary" as const,
    },
    {
      label: "Open AI Tutor",
      description: "Get personalized help",
      icon: Brain,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises&ai=1`
        : "/dashboard",
      variant: "secondary" as const,
    },
    {
      label: "View Past Papers",
      description: "Practice with real exams",
      icon: FileText,
      href: firstChapterBasePath
        ? `${firstChapterBasePath}?tab=exercises`
        : "/dashboard",
      variant: "secondary" as const,
    },
  ];

  return (
    <Card variant="default" className="h-full flex flex-col">
      <CardHeader>
        <h3 className="font-[var(--font-display)] text-base font-bold text-text-primary">
          Quick Actions
        </h3>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col gap-2.5 pt-0">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="block">
            <Button
              variant={action.variant}
              size="md"
              width="full"
              iconLeft={<action.icon />}
              className="justify-start"
            >
              <span className="flex flex-col items-start">
                <span className="text-sm font-medium">{action.label}</span>
                <span
                  className={cn(
                    "text-[11px] font-normal",
                    action.variant === "primary"
                      ? "text-white/70"
                      : "text-text-muted"
                  )}
                >
                  {action.description}
                </span>
              </span>
            </Button>
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}
