import { Router } from "express";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { requireAdminRole } from "../../lib/admin.js";
import { cacheService } from "../../lib/cache/cache.service.js";
import { persistAuditLog, type AdminAuditScope } from "./shared.js";

export const cacheAdminRouter = Router();

/**
 * GET /api/admin/cache/stats - Cache statistics (hit rate, miss rate, eviction counts)
 */
cacheAdminRouter.get("/cache/stats", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const stats = cacheService.getStats();
  res.status(200).json({ data: stats });
});

/**
 * POST /api/admin/cache/purge - Purge all cache entries
 */
cacheAdminRouter.post("/cache/purge", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const deleted = await cacheService.purgeAll();

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  await persistAuditLog({
    scope: "settings",
    action: "Purge cache",
    target: "All cache entries",
    status: "success",
    message: `Purged ${deleted} cache entries`,
    actorId,
    actorName,
  });

  res.status(200).json({
    success: true,
    deletedCount: deleted,
    timestamp: new Date().toISOString(),
  });
});
