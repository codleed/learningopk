import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Register, TitleBlock } from "@/components/kitab";
import { getAdminModerationFlags, getAdminUsers } from "@/lib/admin-api";
import { isStaffSession } from "@/components/admin/admin-guard";
import { getServerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Console — Kitab" };

/* ═══════════════════════════════════════════════════════════════
   CONSOLE — the staff ledger. Queue (flags) + Inspector (users)
   + Register (audit). Replaces /admin without its chrome.
   ═══════════════════════════════════════════════════════════════ */

export default async function KitabConsolePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isStaffSession(session)) redirect("/kitab/today");

  const cookieHeader = (await cookies()).toString();

  const [flags, users] = await Promise.all([
    getAdminModerationFlags({ page: 1, pageSize: 8, status: "open", cookieHeader }).catch(
      () => null
    ),
    getAdminUsers({ page: 1, pageSize: 8, q: "", cookieHeader }).catch(() => null),
  ]);

  return (
    <div>
      <TitleBlock
        crumbs={[{ label: "Kitab", href: "/kitab/today" }, { label: "Console" }]}
        title="The Console"
        lede="Staff view: flags to clear, people to inspect, and the audit register."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <Register
            caption="Queue — open flags"
            entries={(flags?.entries ?? []).map((f) => ({
              when: new Date(f.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }),
              what: f.targetLabel || f.reason,
              href: "/admin/moderation",
            }))}
          />
        </section>

        <section>
          <Register
            caption="Inspector — recent members"
            entries={(users?.entries ?? []).map((u) => ({
              when: new Date(u.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }),
              what: u.name || u.email,
              href: "/admin/users",
            }))}
          />
        </section>
      </div>
    </div>
  );
}
