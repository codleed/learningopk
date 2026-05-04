"use client";

import { deleteModerationReply, deleteModerationThread, type AdminModerationFlag } from "@/lib/admin-api";

import { Button } from "@/components/ui/button";
import { ModerationResolveAction } from "./moderation-resolve-action";

type ModerationQueueTableProps = {
  rows: AdminModerationFlag[];
  onResolved: (flag: AdminModerationFlag) => void;
};

export function ModerationQueueTable({ rows, onResolved }: ModerationQueueTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No moderation flags match current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Target</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Reason</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Reported</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Resolution</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((flag) => (
            <tr key={flag.id} data-testid="moderation-row">
              <td className="px-3 py-2 text-foreground">
                <div className="font-medium">{flag.targetLabel}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{flag.targetType}</div>
              </td>
              <td className="px-3 py-2 text-foreground/90">{flag.reason}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    flag.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  ].join(" ")}
                >
                  {flag.status === "open" ? "Open" : "Resolved"}
                </span>
              </td>
              <td className="px-3 py-2 text-foreground/90">{new Date(flag.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-foreground/90">{flag.resolutionNote ?? "—"}</td>
              <td className="px-3 py-2">
                {flag.status === "open" ? (
                  <div className="flex flex-col gap-1">
                    <ModerationResolveAction flagId={flag.id} targetLabel={flag.targetLabel} onResolved={onResolved} />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          if (flag.targetType === "thread") {
                            await deleteModerationThread(flag.targetId);
                          } else {
                            await deleteModerationReply(flag.targetId);
                          }
                          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/api/admin/moderation/flags/${flag.id}/resolve`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ note: "Content deleted by moderator" }),
                            credentials: "include"
                          });
                          onResolved(flag);
                        } catch (err) { console.error("Delete content failed:", err); }
                      }}
                    >
                      Delete Content
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Resolved</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
