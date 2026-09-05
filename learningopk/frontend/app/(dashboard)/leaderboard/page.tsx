import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LeaderboardPageClient } from "@/components/leaderboard/leaderboard-page-client";
import { getLeaderboard, type LeaderboardMetric } from "@/lib/leaderboard-api";
import { getServerSession } from "@/lib/session";

type LeaderboardPageProps = {
  searchParams: Promise<{
    metric?: string | string[];
  }>;
};

const normalizeMetric = (value: string | string[] | undefined): LeaderboardMetric => {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (resolved === "streak" || resolved === "quizzes") {
    return resolved;
  }

  return "xp";
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const params = await searchParams;
  const metric = normalizeMetric(params.metric);

  const result = await Promise.allSettled([
    getLeaderboard("global", metric, cookieHeader),
    getLeaderboard("board", metric, cookieHeader),
    getLeaderboard("school", metric, cookieHeader),
  ]);

  const error = result.find((entry) => entry.status === "rejected");

  return (
    <LeaderboardPageClient
      session={session}
      metric={metric}
      error={
        error?.status === "rejected"
          ? error.reason instanceof Error
            ? error.reason.message
            : "Unable to load leaderboard."
          : null
      }
      leaderboards={{
        global: result[0].status === "fulfilled" ? result[0].value : null,
        board: result[1].status === "fulfilled" ? result[1].value : null,
        school: result[2].status === "fulfilled" ? result[2].value : null,
      }}
    />
  );
}
