"use client";

import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/admin-api";

type AdminUsersTableProps = {
  rows: AdminUser[];
  mutatingUserIds: Set<string>;
  onToggleRole: (user: AdminUser) => void;
};

export function AdminUsersTable({ rows, mutatingUserIds, onToggleRole }: AdminUsersTableProps) {
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
            <th className="px-3 py-2 text-left font-semibold text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((user) => (
            <tr key={user.id} data-testid="admin-user-row">
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
              <td className="px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleRole(user)}
                  disabled={mutatingUserIds.has(user.id)}
                >
                  {mutatingUserIds.has(user.id)
                    ? "Saving..."
                    : user.role === "admin"
                      ? "Demote to student"
                      : "Promote to admin"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
