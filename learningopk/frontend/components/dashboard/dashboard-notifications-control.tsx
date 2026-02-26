"use client";

import { Bell } from "lucide-react";
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </button>
      {isOpen ? (
        <section className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Recent notifications</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Close
            </button>
          </div>
          {items.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No new notifications.</p> : (
            <ul className="mt-3 space-y-2">
              {items.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-lg border border-border bg-muted/35 px-2 py-2 text-xs text-foreground/85">
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
