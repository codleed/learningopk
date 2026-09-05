import { EmptyState } from "@/components/ui/states";

export type AdminAuditLogEntry = {
  id: string;
  action: string;
  target: string;
  status: "success" | "failed";
  message: string;
  actor: {
    id: string | null;
    name: string;
  };
  occurredAt: string;
};

type AdminAuditLogListProps = {
  entries: AdminAuditLogEntry[];
};

export function AdminAuditLogList({ entries }: AdminAuditLogListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No admin actions yet"
        description="Your moderation actions will appear here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {entry.action} - {entry.target}
            </p>
            <span
              className={[
                "rounded-full px-2 py-1 text-xs font-semibold",
                entry.status === "success"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800",
              ].join(" ")}
            >
              {entry.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{entry.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">Actor: {entry.actor.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(entry.occurredAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
