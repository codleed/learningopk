"use client";

import type { AdminNotification } from "@/lib/admin-api";

type AdminNotificationsTableProps = {
  rows: AdminNotification[];
};

const audienceLabel: Record<AdminNotification["audience"], string> = {
  all: "All users",
  students: "Students",
  admins: "Admins",
};

export function AdminNotificationsTable({ rows }: AdminNotificationsTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No notifications sent yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Title</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Audience</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created by</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} data-testid="admin-notification-row">
              <td className="px-3 py-2 text-foreground">
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.message}</p>
              </td>
              <td className="px-3 py-2 text-foreground/90">{audienceLabel[row.audience]}</td>
              <td className="px-3 py-2 text-foreground/90">{row.status}</td>
              <td className="px-3 py-2 text-foreground/90">{row.createdBy.name}</td>
              <td className="px-3 py-2 text-foreground/90">
                {new Date(row.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
