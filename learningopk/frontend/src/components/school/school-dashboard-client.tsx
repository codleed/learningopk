"use client";

import { Card, CardHeader, CardBody, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";

type DashboardData = NonNullable<Awaited<ReturnType<typeof import("@/lib/school-api").getSchoolDashboard>>>;

export function SchoolDashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data] = useState(initialData);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{data.school.name}</h1>
        <p className="text-sm text-text-secondary">Invite code: <code className="rounded bg-bg-subtle px-2 py-1">{data.school.inviteCode}</code></p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="text-3xl font-bold text-accent-primary">{data.analytics.studentCount}</div>
            <div className="text-sm text-text-secondary">Enrolled Students</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-3xl font-bold text-accent-primary">{data.analytics.avgQuizScore}%</div>
            <div className="text-sm text-text-secondary">Avg Quiz Score</div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Students</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="divide-y divide-border">
            {data.analytics.topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-subtle text-sm font-bold">{i + 1}</span>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-text-secondary">Level {s.level} &bull; {s.xp} XP</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {data.analytics.weakAreas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weak Areas (Class Avg &lt; 70%)</CardTitle>
            <CardDescription>Chapters where your students need more practice</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="divide-y divide-border">
              {data.analytics.weakAreas.map((area) => (
                <div key={area.chapterId} className="flex items-center justify-between py-3">
                  <span>{area.chapterTitle}</span>
                  <span className="rounded-full bg-accent-danger-light px-2 py-1 text-xs font-semibold text-accent-danger">{area.avgScore}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
