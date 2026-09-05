"use client";

import type { AdminAnalyticsSubjectPerformance } from "@/lib/admin-api";

type AdminAnalyticsSubjectTableProps = {
  rows: AdminAnalyticsSubjectPerformance[];
};

export function AdminAnalyticsSubjectTable({ rows }: AdminAnalyticsSubjectTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No subject analytics data is available for this window.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        aria-label="Subject performance"
        className="min-w-full divide-y divide-border-default text-sm"
      >
        <thead className="bg-bg-subtle/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Subject</th>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Grade</th>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Board</th>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Attempts</th>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Avg score</th>
            <th className="px-3 py-2 text-left font-semibold text-text-primary">Active students</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {rows.map((row) => (
            <tr key={row.subjectId}>
              <td className="px-3 py-2 text-text-primary">{row.subjectName}</td>
              <td className="px-3 py-2 text-text-primary/90">{row.grade}</td>
              <td className="px-3 py-2 text-text-primary/90">{row.boardName}</td>
              <td className="px-3 py-2 text-text-primary/90">{row.attempts}</td>
              <td className="px-3 py-2 text-text-primary/90">
                {row.averageScorePercent.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-text-primary/90">{row.activeStudents}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
