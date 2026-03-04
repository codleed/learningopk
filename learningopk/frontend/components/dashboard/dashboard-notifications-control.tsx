"use client";

import { BellRinging } from "@phosphor-icons/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type DashboardNotificationsControlProps = {
  items: string[];
  className?: string;
};

export function DashboardNotificationsControl({ items, className }: DashboardNotificationsControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[0_10px_20px_-20px_rgba(29,40,89,0.85)] transition hover:border-primary/25 hover:text-foreground"
      >
        <BellRinging className="h-4 w-4" weight="duotone" aria-hidden />
      </button>
      {isOpen ? (
        <section className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-[0_26px_44px_-28px_rgba(29,40,89,0.45)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Recent notifications</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Close
            </button>
          </div>
          {items.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No new notifications.</p> : (
            <ul className="mt-3 space-y-2">
              {items.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-xl border border-border bg-muted/60 px-2.5 py-2 text-xs text-foreground/85">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
