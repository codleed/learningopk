import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";

type AdminSectionPlaceholderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AdminSectionPlaceholder({ title, description, action }: AdminSectionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title={title}
        subtitle={description}
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />

      <SectionCard
        title="Coming in next sprint"
        description="This section is included in phase 1 navigation and will gain full workflows in upcoming phases."
        actions={action}
      >
        <p className="text-sm text-muted-foreground">Detailed workflows for this section are planned in upcoming phases.</p>
      </SectionCard>
    </div>
  );
}
