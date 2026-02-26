"use client";

import type { AdminUser } from "@/lib/admin-api";

type AdminUsersTableProps = {
  rows: AdminUser[];
};

export function AdminUsersTable({ rows }: AdminUsersTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No users match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Role</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((user) => (
            <tr key={user.id}>
              <td className="px-3 py-2 text-foreground">{user.name}</td>
              <td className="px-3 py-2 text-foreground/90">{user.email}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    user.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"
                  ].join(" ")}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-3 py-2 text-foreground/90">{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
