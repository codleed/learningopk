import Link from "next/link";

import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Command Center"
        subtitle="Manage moderation workflows, publication controls, and phase rollout priorities."
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
  );
}

