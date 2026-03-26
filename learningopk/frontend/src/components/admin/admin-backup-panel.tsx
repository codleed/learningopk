"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Database, 
  Download, 
  Trash2, 
  Upload, 
  RefreshCw,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from "lucide-react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { 
  getBackupStatus, 
  createBackup, 
  deleteBackup, 
  restoreBackup,
  getBackupDownloadUrl,
  type BackupStatusResponse,
  type CreateBackupResponse 
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type BackupEntry = BackupStatusResponse["backups"][number];

export function AdminBackupPanel() {
  const [status, setStatus] = useState<BackupStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [includeData, setIncludeData] = useState(true);
  const [compression, setCompression] = useState<"gzip" | "none">("gzip");
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupEntry | null>(null);
  const { pushToast } = useToast();

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBackupStatus();
      setStatus(data);
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Failed to load backup status",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const result = await createBackup({ includeData, compression });
      pushToast({
        tone: "success",
        title: "Backup created",
        description: `Created ${result.backup.filename}`
      });
      await fetchStatus();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Backup failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    setIsRestoring(true);
    setRestoreConfirmOpen(false);
    try {
      await restoreBackup(selectedBackup.filename);
      pushToast({
        tone: "success",
        title: "Restore complete",
        description: "Database has been restored from backup"
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Restore failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsRestoring(false);
      setSelectedBackup(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    
    try {
      await deleteBackup(selectedBackup.filename);
      pushToast({
        tone: "success",
        title: "Backup deleted",
        description: `Deleted ${selectedBackup.filename}`
      });
      await fetchStatus();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedBackup(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Create Backup"
        description="Create a new database backup. Choose whether to include data and compression format."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeData"
                checked={includeData}
                onChange={(e) => setIncludeData(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="includeData" className="text-sm">
                Include data (full backup)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="gzip"
                name="compression"
                checked={compression === "gzip"}
                onChange={() => setCompression("gzip")}
                className="h-4 w-4"
              />
              <label htmlFor="gzip" className="text-sm">Gzip compression</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="none"
                name="compression"
                checked={compression === "none"}
                onChange={() => setCompression("none")}
                className="h-4 w-4"
              />
              <label htmlFor="none" className="text-sm">No compression</label>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => void handleCreateBackup()} 
              disabled={isCreating}
              className="gap-2"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isCreating ? "Creating..." : "Create Backup"}
            </Button>
            <Button 
              variant="secondary"
              onClick={() => void fetchStatus()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Existing Backups"
        description={`${status?.backups.length || 0} backup(s) available`}
      >
        {status?.backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HardDrive className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No backups found. Create your first backup above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {status?.backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    backup.includesData ? "bg-emerald-500/10" : "bg-blue-500/10"
                  )}>
                    {backup.includesData ? (
                      <Database className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <HardDrive className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{backup.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(backup.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(backup.size)}
                      </span>
                      {backup.includesData ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Full backup
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-600">
                          Schema only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a 
                      href={getBackupDownloadUrl(backup.filename)} 
                      download
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={!backup.includesData}
                    onClick={() => {
                      setSelectedBackup(backup);
                      setRestoreConfirmOpen(true);
                    }}
                    className="gap-2"
                    title={!backup.includesData ? "Schema-only backup cannot be restored" : undefined}
                  >
                    <Upload className="h-4 w-4" />
                    Restore
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedBackup(backup);
                      setDeleteConfirmOpen(true);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Backup Information"
        description="About database backups"
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <p>Full backups include all data (users, progress, quiz results, etc.)</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <p>Schema backups include only the database structure (tables, columns)</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <p>Restoring a backup will replace all current data. This action cannot be undone.</p>
          </div>
          <div className="flex items-start gap-2">
            <HardDrive className="mt-0.5 h-4 w-4 text-blue-500" />
            <p>Backups are stored in: <code className="rounded bg-muted px-1">{status?.backupDir}</code></p>
          </div>
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 text-purple-500" />
            <p>Database: <code className="rounded bg-muted px-1">{status?.dbName}</code></p>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={restoreConfirmOpen}
        title="Restore Backup?"
        description={`This will replace all current data with the backup "${selectedBackup?.filename}". This action cannot be undone.`}
        confirmLabel="Restore"
        danger={true}
        onConfirm={() => void handleRestore()}
        onOpenChange={setRestoreConfirmOpen}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Backup?"
        description={`This will permanently delete "${selectedBackup?.filename}". This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
        onConfirm={() => void handleDelete()}
        onOpenChange={setDeleteConfirmOpen}
      />
    </div>
  );
}
