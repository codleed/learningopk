import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StatsPageClient } from "@/components/stats/stats-page-client";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";

export default async function StatsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const result = await getDashboardSummary(cookieStore.toString())
    .then((data) => ({
      data,
      error: null as string | null,
    }))
    .catch((error: unknown) => {
      console.error("[Stats]", error);
      return {
        data: null,
        error: "We couldn't load your stats right now. Please try again.",
      };
    });

  return (
    <StatsPageClient
      session={session}
      summaryError={result.error}
      dailyActivity={result.data?.dailyActivity ?? []}
    />
  );
}
