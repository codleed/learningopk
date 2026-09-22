import type { ReactNode } from "react";

import { KitabShell } from "@/components/kitab";
import { getServerSession } from "@/lib/session";

/* ═══════════════════════════════════════════════════════════════
   Kitab root layout — wraps every hub in the chrome-less shell.
   ═══════════════════════════════════════════════════════════════ */

export default async function KitabLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession().catch(() => null);

  return <KitabShell session={session}>{children}</KitabShell>;
}
