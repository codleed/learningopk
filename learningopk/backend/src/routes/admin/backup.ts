import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../../lib/admin.js";
import { listBackups, createBackup, restoreBackup, deleteBackup } from "../../services/backup.service.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { persistAuditLog } from "./shared.js";

const backupCreateBodySchema = z.object({
  label: z.string().trim().min(1).max(100).optional()
});

const backupRestoreParamsSchema = z.object({
  name: z.string().trim().min(1).max(255)
});

export const backupAdminRouter = Router();

/**
 * GET /api/admin/backup - List available database backups
 */
backupAdminRouter.get("/backup", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  try {
    const backups = await listBackups();
    res.status(200).json({ backups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list backups";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/backup - Create a new database backup
 */
backupAdminRouter.post("/backup", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = backupCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid backup label",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  try {
    const backup = await createBackup(parsedBody.data.label);

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: backup.name,
      status: "success",
      message: `Created backup "${backup.name}" (${(backup.sizeBytes / 1024).toFixed(1)} KB)`,
      actorId,
      actorName
    });

    res.status(201).json({ backup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create backup";

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: "Unknown",
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/backup/:name/restore - Restore database from a backup file
 */
backupAdminRouter.post("/backup/:name/restore", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = backupRestoreParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid backup name",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const backupName = parsedParams.data.name;

  try {
    await restoreBackup(backupName);

    await persistAuditLog({
      scope: "settings",
      action: "Restore database backup",
      target: backupName,
      status: "success",
      message: `Restored database from backup "${backupName}"`,
      actorId,
      actorName
    });

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore backup";

    await persistAuditLog({
      scope: "settings",
      action: "Restore database backup",
      target: backupName,
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/admin/backup/:name - Delete a backup file
 */
backupAdminRouter.delete("/backup/:name", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = backupRestoreParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid backup name",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const backupName = parsedParams.data.name;

  try {
    await deleteBackup(backupName);

    await persistAuditLog({
      scope: "settings",
      action: "Delete database backup",
      target: backupName,
      status: "success",
      message: `Deleted backup "${backupName}"`,
      actorId,
      actorName
    });

    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete backup";

    await persistAuditLog({
      scope: "settings",
      action: "Delete database backup",
      target: backupName,
      status: "failed",
      message,
      actorId,
      actorName
    });

    res.status(500).json({ error: message });
  }
});
