"use client";

import { AlertTriangle, CheckCircle, Flag, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getModeratorOverview, type ModeratorOverviewResponse } from "@/lib/admin-api";

export function ModeratorDashboardPanel() {
  const [data, setData] = useState<ModeratorOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModeratorOverview({})
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const openFlags = data?.openFlags ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Flag className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{openFlags}</p>
                <p className="text-sm text-muted-foreground">Open Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {data?.recentResolved?.length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Recently Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {data?.recentResolved?.filter((f) => f.resolvedAt)?.length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/moderation">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Flag className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Moderation Queue</p>
                <p className="text-sm text-muted-foreground">Review reported content</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/forum">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Forum</p>
                <p className="text-sm text-muted-foreground">Manage forum content</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Users</p>
                <p className="text-sm text-muted-foreground">View and manage users</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recently Resolved */}
      {data?.recentResolved && data.recentResolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentResolved.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.targetLabel}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
