import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { AdminSession } from "./admin-guard";

type AdminTopbarProps = {
  session: AdminSession;
};

export function AdminTopbar({ session }: AdminTopbarProps) {
  const displayName = session.user.name?.trim() || session.user.email;

  return (
    <header className="surface-card rounded-3xl border border-border px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Admin Workspace</p>
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Super Admin
          </span>
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
