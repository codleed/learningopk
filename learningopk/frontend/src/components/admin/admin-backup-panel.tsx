"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  getAdminBackups,
  createAdminBackup,
  restoreAdminBackup,
  deleteAdminBackup,
  type AdminBackupEntry,
} from "@/lib/admin-api";

type AdminBackupPanelProps = {
  initialBackups: AdminBackupEntry[];
};

const SIZES = ["B", "KB", "MB", "GB"] as const;

function formatBytes(bytes: number): string {
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < SIZES.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${SIZES[unitIndex]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminBackupPanel({ initialBackups }: AdminBackupPanelProps) {
  const [backups, setBackups] = useState<AdminBackupEntry[]>(initialBackups);
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pushToast } = useToast();

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminBackups();
      setBackups(payload.backups);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh backups.";
      pushToast({ tone: "error", title: "Refresh failed", description: message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createAdminBackup({ label: label.trim() || undefined });
      setBackups((prev) => [result.backup, ...prev]);
      setLabel("");
      pushToast({
        tone: "success",
        title: "Backup created",
        description: `${result.backup.name} (${formatBytes(result.backup.sizeBytes)})`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create backup.";
      pushToast({ tone: "error", title: "Backup failed", description: message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (name: string) => {
    setRestoring(name);
    setConfirmRestore(null);
    try {
      await restoreAdminBackup(name);
      pushToast({
        tone: "success",
        title: "Database restored",
        description: `Successfully restored from "${name}".`,
      });
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore backup.";
      pushToast({ tone: "error", title: "Restore failed", description: message });
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await deleteAdminBackup(name);
      setBackups((prev) => prev.filter((b) => b.name !== name));
      pushToast({
        tone: "success",
        title: "Backup deleted",
        description: `"${name}" has been removed.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete backup.";
      pushToast({ tone: "error", title: "Delete failed", description: message });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Create Backup"
        description="Save a snapshot of the current database state."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="backup-label"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Label (optional)
            </label>
            <input
              id="backup-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. after-seed"
              maxLength={100}
              className="h-9 w-full rounded-md border border-border-default bg-surface-primary px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleCreate()}
            disabled={isCreating || isRefreshing}
          >
            {isCreating ? "Creating..." : "Create Backup"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Available Backups"
        description={`${backups.length} backup${backups.length !== 1 ? "s" : ""} found. Restore or delete as needed.`}
        actions={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      >
        {backups.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">
            No backups yet. Create one above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-default/60">
                  <th className="pb-2 pr-3 font-medium text-text-secondary">Name</th>
                  <th className="pb-2 pr-3 font-medium text-text-secondary">Size</th>
                  <th className="pb-2 pr-3 font-medium text-text-secondary">Created</th>
                  <th className="pb-2 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.name} className="border-b border-border-default/40 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-text-primary">
                      {backup.name}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge size="sm" variant="default">
                        {formatBytes(backup.sizeBytes)}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {confirmRestore === backup.name ? (
                          <>
                            <span className="text-xs font-medium text-red-500">Are you sure?</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => void handleRestore(backup.name)}
                              disabled={restoring === backup.name}
                            >
                              {restoring === backup.name ? "Restoring..." : "Yes"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmRestore(null)}
                              disabled={restoring === backup.name}
                            >
                              No
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmRestore(backup.name)}
                              disabled={!!restoring || !!deleting}
                            >
                              Restore
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleDelete(backup.name)}
                              disabled={deleting === backup.name || !!restoring}
                            >
                              {deleting === backup.name ? "Deleting..." : "Delete"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="How It Works"
        description="Backups are stored as SQL dump files in the project's backups/ directory using PostgreSQL's pg_dump."
      >
        <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>
            <strong>Backup</strong> creates a full SQL dump of all tables and data via Docker.
          </li>
          <li>
            <strong>Restore</strong> clears the database and replays the backup file. This is
            destructive — make sure you have a backup before restoring.
          </li>
          <li>
            <strong>Delete</strong> removes a backup file permanently from disk.
          </li>
          <li>All operations are logged to the admin audit trail.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
