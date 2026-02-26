import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TabItem = {
  key: string;
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string | number;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  ariaLabel?: string;
  className?: string;
};

export function Tabs({ items, activeKey, ariaLabel = "Section tabs", className }: TabsProps) {
  return (
    <nav className={cn("flex flex-wrap gap-2", className)} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.key === activeKey;

        if (item.disabled) {
          return (
            <span
              key={item.key}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border/70 bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground"
              aria-disabled="true"
            >
              {item.label}
              {item.badge !== undefined ? <Badge variant="neutral">{item.badge}</Badge> : null}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-[var(--elevation-soft)]"
                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/50"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
            {item.badge !== undefined ? <Badge variant={isActive ? "info" : "neutral"}>{item.badge}</Badge> : null}
          </Link>
        );
      })}
    </nav>
  );
}

