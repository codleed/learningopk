import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { SrsReviewDeck } from "@/components/learn/srs-review-deck";
import { getServerSession } from "@/lib/session";

export default async function ReviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      session={session}
      currentPath="/review"
      contentClassName="max-w-3xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8"
    >
      <div className="mb-6">
        <PageHeader
          title="Spaced Repetition Review"
          subtitle="Review your flashcards using the SM-2 algorithm for optimal retention."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Review" },
          ]}
        />
      </div>

      <SrsReviewDeck />
    </AppShell>
  );
}
