"use client";

import type { AdminAuditLogResponseEntry } from "@/lib/admin-api";

type AdminAuditTableProps = {
  rows: AdminAuditLogResponseEntry[];
};

const scopeLabel = (scope: AdminAuditLogResponseEntry["scope"]) => {
  if (!scope) {
    return "unknown";
  }
  return scope;
};

export function AdminAuditTable({ rows }: AdminAuditTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit logs match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm" aria-label="Admin audit logs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Occurred at</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Scope</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Target</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Actor</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} data-testid="admin-audit-row">
              <td className="px-3 py-2 text-foreground/90">{new Date(row.occurredAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-foreground/90">{scopeLabel(row.scope)}</td>
              <td className="px-3 py-2 text-foreground">{row.action}</td>
              <td className="px-3 py-2 text-foreground/90">{row.target}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    row.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  ].join(" ")}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 text-foreground/90">{row.actor.name}</td>
              <td className="px-3 py-2 text-foreground/90">
                <details>
                  <summary className="cursor-pointer select-none text-sm font-medium text-foreground">View message</summary>
                  <p className="mt-1 text-sm text-muted-foreground">{row.message}</p>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
