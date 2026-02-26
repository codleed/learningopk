import Link from "next/link";

import { AdminGuard } from "@/components/admin/admin-guard";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getServerSession();

  return (
    <AppShell session={session} currentPath="/admin">
      <AdminGuard session={session}>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Admin"
            title="Admin Control Panel"
            subtitle="Moderate content visibility and community priority threads."
          />
          <section className="grid gap-4 md:grid-cols-2">
            <SectionCard
              title="Content Publishing"
              description="Publish or unpublish chapters and inspect audit output."
            >
              <Link href="/admin/content">
                <Button>Open content controls</Button>
              </Link>
            </SectionCard>
            <SectionCard
              title="Forum Moderation"
              description="Pin and unpin threads for student visibility."
            >
              <Link href="/admin/forum">
                <Button>Open forum moderation</Button>
              </Link>
            </SectionCard>
          </section>
        </div>
      </AdminGuard>
    </AppShell>
  );
}

