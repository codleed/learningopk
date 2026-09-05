"use client";

import { Bell, Flame, Trophy, Users } from "lucide-react";

import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudyGroupDetailResponse } from "@/lib/study-groups-api";

export function StudyGroupDetailClient({ payload }: { payload: StudyGroupDetailResponse }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-accent-primary" />
            Member progress
          </CardTitle>
          <CardDescription>
            Shared accountability without chat noise — chapter completion, quiz strength, and streak
            momentum.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border-default">
            <table className="min-w-full divide-y divide-border-default text-sm">
              <thead className="bg-bg-subtle/80 text-left text-xs uppercase tracking-[0.16em] text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Chapter completion</th>
                  <th className="px-4 py-3 font-medium">Best quiz</th>
                  <th className="px-4 py-3 font-medium">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-bg-surface/80">
                {payload.members.map((member) => (
                  <tr key={member.userId}>
                    <td className="px-4 py-3 font-medium text-text-primary">{member.name}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {member.chapterCompletionPercent}%
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {member.bestQuizScorePercent}%
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {member.streakDays} day{member.streakDays === 1 ? "" : "s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-4 w-4 text-accent-warning" />
              Your notifications
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {payload.notifications.length === 0 ? (
              <p className="text-sm text-text-secondary">No group alerts yet.</p>
            ) : (
              payload.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-border-default bg-bg-subtle/70 p-3"
                >
                  <p className="text-sm text-text-primary">{notification.message}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {new Date(notification.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-4 w-4 text-accent-success" />
              Activity feed
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {payload.activityFeed.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Activity will appear as members complete chapters and beat quiz scores.
              </p>
            ) : (
              payload.activityFeed.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border-default bg-bg-subtle/70 p-3"
                >
                  <div className="flex items-start gap-2">
                    {entry.eventType === "chapter_completed" ? (
                      <Flame className="mt-0.5 h-4 w-4 text-accent-warning" />
                    ) : (
                      <Trophy className="mt-0.5 h-4 w-4 text-accent-success" />
                    )}
                    <div>
                      <p className="text-sm text-text-primary">{entry.message}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {new Date(entry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
