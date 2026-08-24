"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Flame,
  Globe,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/foundation/app-shell";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  TabContent,
  TabList,
  Tabs,
  TabTrigger,
} from "@/components/ui";
import type {
  LeaderboardMetric,
  LeaderboardResponse,
  LeaderboardScope,
} from "@/lib/leaderboard-api";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

const scopeTabs: Array<{ value: LeaderboardScope; label: string }> = [
  { value: "global", label: "Global" },
  { value: "board", label: "Your Board" },
  { value: "school", label: "Your Grade" },
];

const metricOptions: Array<{ value: LeaderboardMetric; label: string; icon: typeof Trophy }> = [
  { value: "xp", label: "XP", icon: Trophy },
  { value: "streak", label: "Streak", icon: Flame },
  { value: "quizzes", label: "Quizzes", icon: Target },
];

const badgeStyles: Record<NonNullable<LeaderboardResponse["entries"][number]["badge"]>, string> = {
  gold: "border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300",
  silver: "border-slate-400/60 bg-slate-400/15 text-slate-700 dark:text-slate-200",
  bronze: "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

type LeaderboardPageClientProps = {
  session: SessionPayload;
  leaderboards: Record<LeaderboardScope, LeaderboardResponse | null>;
  metric: LeaderboardMetric;
  error: string | null;
};

export function LeaderboardPageClient({
  session,
  leaderboards,
  metric,
  error,
}: LeaderboardPageClientProps) {
  const [activeScope, setActiveScope] = useState<LeaderboardScope>("global");

  const activeLeaderboard = leaderboards[activeScope];
  const currentMetric = useMemo(
    () => metricOptions.find((option) => option.value === metric) ?? metricOptions[0],
    [metric]
  );

  return (
    <AppShell
      session={session}
      currentPath="/leaderboard"
      contentClassName="max-w-[96rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8"
    >
      <div className="space-y-6">
        <PageHeader
          sticky
          stickyClassName="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          title="Leaderboard"
          subtitle="Benchmark your progress against your board, grade, and the wider LearningoPK cohort."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Leaderboard" }]}
          badge={<Badge variant="primary">Refreshes every 5 minutes</Badge>}
        />

        {error ? (
          <div className="rounded-2xl border border-accent-danger/30 bg-accent-danger-light/30 p-4 text-sm text-accent-danger">
            Unable to load leaderboard data. {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card
            variant="gradient"
            style={{
              ["--card-gradient" as string]:
                "linear-gradient(135deg, rgba(56,189,248,0.45), rgba(99,102,241,0.25), rgba(251,191,36,0.22))",
            }}
          >
            <CardBody className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <Badge
                  variant="outline"
                  className="w-fit gap-2 border-white/20 bg-white/10 text-text-primary backdrop-blur"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Competitive Benchmarking
                </Badge>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary">Current metric</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
                      <currentMetric.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-text-primary">
                        {currentMetric.label} standings
                      </p>
                      <p className="text-sm text-text-secondary">
                        See how you stack up across active learners.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:min-w-[18rem] sm:grid-cols-2">
                <MetricPill
                  icon={Globe}
                  label="Global students"
                  value={leaderboards.global?.currentUser.totalStudents ?? 0}
                />
                <MetricPill
                  icon={Users}
                  label="Your rank"
                  value={activeLeaderboard?.currentUser.rank ?? 0}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rank in context</CardTitle>
              <CardDescription>
                {activeLeaderboard
                  ? `You're ranked #${activeLeaderboard.currentUser.rank.toLocaleString()} of ${activeLeaderboard.currentUser.totalStudents.toLocaleString()} students`
                  : "Your ranking context will appear here once leaderboard data loads."}
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-3 pt-0">
              <div className="rounded-2xl border border-border-default bg-bg-subtle/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                      Visibility
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary">
                      {activeLeaderboard?.currentUser.leaderboardPublic
                        ? "Public leaderboard enabled"
                        : "Private leaderboard enabled"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      activeLeaderboard?.currentUser.leaderboardPublic ? "success" : "warning"
                    }
                  >
                    {activeLeaderboard?.currentUser.leaderboardPublic ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              </div>

              {activeLeaderboard?.currentUser.badge ? (
                <Badge
                  className={cn(
                    "w-fit border px-3 py-1 text-xs uppercase tracking-[0.18em]",
                    badgeStyles[activeLeaderboard.currentUser.badge]
                  )}
                >
                  <Award className="h-3.5 w-3.5" />
                  Top 100 {activeLeaderboard.currentUser.badge}
                </Badge>
              ) : (
                <p className="text-sm text-text-secondary">
                  Break into the global top 100 in XP to unlock a profile badge.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Tabs
          value={activeScope}
          onValueChange={(value) => setActiveScope(value as LeaderboardScope)}
        >
          <TabList variant="pills" className="w-fit flex-wrap">
            {scopeTabs.map((tab) => (
              <TabTrigger
                key={tab.value}
                value={tab.value}
                variant="pills"
                layoutId="leaderboard-scope-tab"
              >
                {tab.label}
              </TabTrigger>
            ))}
          </TabList>

          {scopeTabs.map((tab) => {
            const leaderboard = leaderboards[tab.value];

            return (
              <TabContent key={tab.value} value={tab.value} className="mt-5">
                {!leaderboard || leaderboard.entries.length === 0 ? (
                  <EmptyState
                    title="No leaderboard entries yet"
                    description="Complete more study sessions and quizzes to populate this cohort."
                    icon={<Trophy className="h-6 w-6" />}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{tab.label}</CardTitle>
                        <CardDescription>
                          Ranked by {currentMetric.label.toLowerCase()} with weekly momentum and
                          badge highlights.
                        </CardDescription>
                      </CardHeader>
                      <CardBody className="space-y-3 pt-0">
                        {leaderboard.entries.map((entry) => (
                          <div
                            key={`${tab.value}-${entry.userId}`}
                            className={cn(
                              "grid gap-3 rounded-2xl border px-4 py-4 transition-colors sm:grid-cols-[72px_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] sm:items-center",
                              entry.isCurrentUser
                                ? "border-accent-primary/35 bg-accent-primary/8 shadow-[var(--shadow-sm)]"
                                : "border-border-default bg-bg-surface hover:bg-bg-subtle/60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-subtle font-semibold text-text-primary">
                                #{entry.rank}
                              </div>
                              {entry.badge ? (
                                <Badge
                                  className={cn(
                                    "border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]",
                                    badgeStyles[entry.badge]
                                  )}
                                >
                                  {entry.badge}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar src={entry.avatarUrl} name={entry.name} size="lg" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-text-primary">
                                    {entry.name}
                                  </p>
                                  {entry.isCurrentUser ? (
                                    <Badge variant="primary" size="sm">
                                      You
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-text-secondary">
                                  Level {entry.level} • {entry.xp.toLocaleString()} XP
                                </p>
                              </div>
                            </div>

                            <StatColumn
                              label="Streak"
                              value={`${entry.streak} days`}
                              icon={Flame}
                            />
                            <StatColumn
                              label="Quizzes"
                              value={entry.quizzes.toLocaleString()}
                              icon={Target}
                            />
                            <StatColumn
                              label="Weekly change"
                              value={`${entry.weeklyChange > 0 ? "+" : ""}${entry.weeklyChange}`}
                              icon={entry.weeklyChange >= 0 ? TrendingUp : TrendingDown}
                              tone={entry.weeklyChange >= 0 ? "positive" : "negative"}
                            />
                          </div>
                        ))}
                      </CardBody>
                    </Card>
                  </motion.div>
                )}
              </TabContent>
            );
          })}
        </Tabs>
      </div>
    </AppShell>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border-default/80 bg-bg-surface/75 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}

function StatColumn({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Flame;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-bg-subtle/70 px-3 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-muted">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "positive" && "text-accent-success",
            tone === "negative" && "text-accent-danger"
          )}
        />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
