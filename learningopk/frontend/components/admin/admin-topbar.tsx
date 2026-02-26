import { Bell, PanelLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

import type { AdminSession } from "./admin-guard";

type AdminTopbarProps = {
  session: AdminSession;
  onOpenNavigation: () => void;
};

const roleLabelByValue: Record<string, string> = {
  admin: "Super Admin",
  super_admin: "Super Admin",
  moderator: "Moderator",
  student: "Student"
};

const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`)
    .join(" ");

export function AdminTopbar({ session, onOpenNavigation }: AdminTopbarProps) {
  const displayName = session.user.name?.trim() || session.user.email;
  const roleValue = typeof session.user.role === "string" ? session.user.role : "admin";
  const roleLabel = roleLabelByValue[roleValue] ?? toTitleCase(roleValue);

  return (
    <header className="surface-card rounded-3xl border border-border px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onOpenNavigation}
            aria-label="Open navigation"
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </Button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Admin Workspace</p>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {roleLabel}
          </span>

          <Link
            href="/admin/notifications"
            aria-label="Open notifications"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:border-primary/40 hover:bg-accent/50"
          >
            <Bell className="h-4 w-4" aria-hidden />
          </Link>

          <LogoutButton label="Sign out" ariaLabel="Sign out" />

          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Return to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
