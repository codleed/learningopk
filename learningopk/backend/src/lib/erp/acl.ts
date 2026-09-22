import type { RequestHandler, Response } from "express";

import { isErpPermission, type ErpPermission } from "@learningopk/shared";

import type { AuthenticatedRequest } from "../session.js";
import { errorResponse } from "../response.js";
import { hasPermission, resolveErpAccess, type ErpAccessContext } from "./permissions.js";

export type ErpRequest = AuthenticatedRequest & {
  erpAccess?: ErpAccessContext;
  schoolId?: number;
};

export function parseSchoolId(req: ErpRequest): number | null {
  const raw =
    (req.query.schoolId as string | undefined) ??
    (req.params.schoolId as string | undefined) ??
    (req.headers["x-school-id"] as string | undefined);
  if (typeof raw !== "string" || !raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolve ERP access and attach it to the request. When `permission` is
 * given, the request is rejected unless the user holds it.
 */
export async function requireErpAccess(
  req: ErpRequest,
  res: Response,
  permission?: ErpPermission
): Promise<ErpAccessContext | null> {
  const schoolId = parseSchoolId(req);
  if (!schoolId) {
    res
      .status(400)
      .json(
        errorResponse(
          "schoolId is required (query, param, or x-school-id header)",
          "SCHOOL_ID_REQUIRED"
        )
      );
    return null;
  }

  const access = await resolveErpAccess(req.session.user.id, schoolId, req.userRole);

  if (!access) {
    res.status(404).json(errorResponse("School not found", "SCHOOL_NOT_FOUND"));
    return null;
  }

  // No role assignments and not an owner/platform admin → no ERP access.
  if (!access.isPlatformAdmin && !access.isSchoolAdmin && access.permissions.size === 0) {
    res.status(403).json(errorResponse("You do not have access to this school's ERP", "FORBIDDEN"));
    return null;
  }

  if (permission && !isErpPermission(permission)) {
    res.status(500).json(errorResponse("Unknown permission", "INTERNAL_ERROR"));
    return null;
  }

  if (permission && !hasPermission(access, permission)) {
    res.status(403).json(errorResponse(`Missing permission: ${permission}`, "PERMISSION_DENIED"));
    return null;
  }

  req.erpAccess = access;
  req.schoolId = schoolId;
  return access;
}

/** Wrap a route handler with permission enforcement. Usable as chain middleware:
 * `router.get(path, requireSession, erpGuard("X"), handler)`. */
export function erpGuard(permission?: ErpPermission): RequestHandler {
  return async (req, res, next) => {
    const access = await requireErpAccess(req as ErpRequest, res, permission);
    if (!access) return;
    next();
  };
}
