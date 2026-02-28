"use client";

import Link from "next/link";
import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminOverview, type AdminOverviewResponse, type AdminOverviewActivityScope } from "@/lib/admin-api";

type WindowDays = 7 | 30 | 90;

type AdminCommandCenterPanelProps = {
  initialPayload: AdminOverviewResponse;
};

const activityScopeHref = (scope: AdminOverviewActivityScope): string => {
  switch (scope) {
    case "content":
      return "/admin/content";
    case "forum":
      return "/admin/community";
    case "moderation":
      return "/admin/moderation";
    case "users":
      return "/admin/users";
    case "notifications":
      return "/admin/notifications";
    case "settings":
      return "/admin/settings";
    default:
      return "/admin";
  }
};

export function AdminCommandCenterPanel({ initialPayload }: AdminCommandCenterPanelProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pushToast } = useToast();

  const refreshOverview = async (nextWindowDays: WindowDays) => {
    setIsRefreshing(true);
    try {
      const nextPayload = await getAdminOverview({
        windowDays: nextWindowDays
      });
      setPayload(nextPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh command center.";
      pushToast({
        tone: "error",
        title: "Command center unavailable",
        description: message
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Operational Intelligence"
        description="Live operational metrics and alerting for admin workflows."
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => void refreshOverview(payload.windowDays)} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
            <div className="space-y-1.5">
              <label htmlFor="admin-overview-window" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Time window
              </label>
              <Select
                id="admin-overview-window"
                value={String(payload.windowDays)}
                disabled={isRefreshing}
                onChange={(event) => {
                  void refreshOverview(Number(event.target.value) as WindowDays);
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{`Notification KPI window: last ${payload.windowDays} days`}</p>
          </div>

          {payload.alerts.showHighPriorityBanner ? (
            <div
              data-testid="admin-overview-alert-banner"
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p className="font-semibold">High-priority operational alert</p>
              {payload.alerts.reasons.map((reason) => (
                <p key={reason} className="mt-1">
                  {reason}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article data-testid="admin-overview-kpi-open-flags" className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open moderation flags</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{payload.kpis.openModerationFlags}</p>
              <Link href="/admin/moderation" className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4">
                View moderation queue
              </Link>
            </article>

            <article data-testid="admin-overview-kpi-suspended-users" className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suspended users</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{payload.kpis.suspendedUsers}</p>
              <Link href="/admin/users" className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4">
                View user lifecycle
              </Link>
            </article>

            <article data-testid="admin-overview-kpi-failed-actions" className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Failed admin actions (24h)</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{payload.kpis.failedAdminActionsLast24h}</p>
              <Link
                href="/admin/audit?status=failed"
                data-testid="admin-overview-kpi-failed-actions-link"
                className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4"
              >
                Investigate failures
              </Link>
            </article>

            <article data-testid="admin-overview-kpi-notifications" className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications sent</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{payload.kpis.notificationsSentInWindow}</p>
              <Link href="/admin/notifications" className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4">
                View notifications log
              </Link>
            </article>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent admin activity" description="Latest cross-scope audit events for operational review.">
        {payload.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent admin activity available for this environment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm" aria-label="Recent admin activity">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Occurred at</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Scope</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Actor</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Target</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Navigate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payload.recentActivity.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 text-foreground/90">{new Date(entry.occurredAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-foreground/90">{entry.scope}</td>
                    <td className="px-3 py-2 text-foreground">{entry.action}</td>
                    <td className="px-3 py-2 text-foreground/90">{entry.status}</td>
                    <td className="px-3 py-2 text-foreground/90">{entry.actor.name}</td>
                    <td className="px-3 py-2 text-foreground/90">{entry.target}</td>
                    <td className="px-3 py-2">
                      <Link
                        data-testid="admin-overview-activity-link"
                        href={activityScopeHref(entry.scope)}
                        className="text-sm font-medium text-foreground underline underline-offset-4"
                      >
                        Open scope
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
