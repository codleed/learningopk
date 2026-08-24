import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { FormulaLibraryClient } from "@/components/formulas/formula-library-client";
import { AppShell } from "@/components/foundation/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { getFormulas } from "@/lib/formulas-api";
import { getServerSession } from "@/lib/session";

type SearchParams = {
  q?: string | string[];
  subjectId?: string | string[];
  chapterId?: string | string[];
  tag?: string | string[];
};

const getFirstValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const toOptionalNumber = (value: string): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export default async function FormulasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialQuery = {
    q: getFirstValue(params.q),
    subjectId: toOptionalNumber(getFirstValue(params.subjectId)),
    chapterId: toOptionalNumber(getFirstValue(params.chapterId)),
    tag: getFirstValue(params.tag)
  };

  const cookieStore = await cookies();

  const formulasResult = await getFormulas(cookieStore.toString(), initialQuery)
    .then((data) => ({ data, error: null as string | null }))
    .catch((error: unknown) => ({
      data: null,
      error: error instanceof Error ? error.message : "Unable to load formulas."
    }));

  return (
    <AppShell
      session={session}
      currentPath="/formulas"
      contentClassName="max-w-7xl mx-auto px-4 pb-10 pt-4 sm:px-6 lg:px-8"
    >
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title="Find the formula you need"
          subtitle="Search by topic, open the explanation when you need context, and star the formulas worth revisiting."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Formula Library" }
          ]}
        />

        {formulasResult.error || !formulasResult.data ? (
          <Card variant="default">
            <CardBody className="py-10 text-center text-sm text-text-secondary">
              {formulasResult.error ?? "Formulas are temporarily unavailable."}
            </CardBody>
          </Card>
        ) : (
          <FormulaLibraryClient initialData={formulasResult.data} initialQuery={initialQuery} />
        )}
      </div>
    </AppShell>
  );
}
