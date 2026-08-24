import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { NotesPageClient } from "@/components/notes/notes-page-client";
import { AppShell } from "@/components/foundation/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { getNotesServer } from "@/lib/notes-api";
import { getServerSession } from "@/lib/session";

export default async function NotesPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();

  const notesResult = await getNotesServer(cookieStore.toString())
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: error instanceof Error ? error.message : "Unable to load notes."
    }));

  return (
    <AppShell
      session={session}
      currentPath="/notes"
      contentClassName="max-w-7xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8"
    >
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title="Notes that help you recall"
          subtitle="Capture the idea, worked example, or formula you’ll want beside you before the next test."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Notes" }
          ]}
        />

        {notesResult.error || !notesResult.data ? (
          <Card variant="default">
            <CardBody className="py-10 text-center text-sm text-text-secondary">
              {notesResult.error ?? "Notes are temporarily unavailable."}
            </CardBody>
          </Card>
        ) : (
          <NotesPageClient initialNotes={notesResult.data} />
        )}
      </div>
    </AppShell>
  );
}
