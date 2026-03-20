import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { getDashboardSummary } from "@/lib/progress-api";
import { getServerSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function CalendarPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const summary = await getDashboardSummary(cookieStore.toString())
    .catch(() => null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const activityDates = new Set(
    summary?.weeklyActivity
      .filter((a) => a.activityCount > 0)
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.getDate();
      }) ?? []
  );

  const events = summary?.recentActivity.slice(0, 5).map((activity, index) => ({
    id: `${activity.occurredAt}-${index}`,
    title: activity.type === "chapter_visit"
      ? `Studied: ${activity.chapterTitle}`
      : `Quiz: ${activity.chapterTitle}`,
    date: activity.occurredAt,
    type: activity.type,
  })) ?? [];

  return (
    <AppShell session={session} currentPath="/calendar">
      <div className="max-w-7xl animate-fade-in">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Calendar" },
          ]}
          className="mb-6"
        />

        <header className="mb-6 border-b border-border/75 pb-4">
          <h1 className="text-3xl font-semibold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your learning schedule and upcoming activities
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                  Activity
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const hasActivity = activityDates.has(day);
                const isToday = day === currentDay;
                const isPast = day < currentDay;

                return (
                  <div
                    key={day}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-lg transition-colors",
                      isToday && "bg-[var(--primary)] text-primary-foreground",
                      !isToday && hasActivity && "bg-[var(--primary)]/10 text-[var(--primary)]",
                      !isToday && !hasActivity && isPast && "text-muted-foreground/50",
                      !isToday && !hasActivity && !isPast && "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    {hasActivity && !isToday && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--primary)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Today</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {MONTHS[currentMonth]} {currentDay}, {currentYear}
              </p>
              <div className="mt-4 space-y-3">
                {events.length > 0 ? (
                  events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-border/50 bg-muted/30 p-3"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No activities scheduled for today
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">This Week</h3>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Study hours</span>
                  <span className="text-sm font-semibold text-foreground">
                    {Math.round(
                      (summary?.weeklyActivity.reduce((acc, a) => acc + a.activityCount, 0) ?? 0) * 0.5
                    )}h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active days</span>
                  <span className="text-sm font-semibold text-foreground">
                    {summary?.weeklyActivity.filter((a) => a.activityCount > 0).length ?? 0}/7
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chapters visited</span>
                  <span className="text-sm font-semibold text-foreground">
                    {summary?.recentActivity.filter((a) => a.type === "chapter_visit").length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quizzes taken</span>
                  <span className="text-sm font-semibold text-foreground">
                    {summary?.recentActivity.filter((a) => a.type === "quiz_submit").length ?? 0}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
