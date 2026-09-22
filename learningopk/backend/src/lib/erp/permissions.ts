import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import { schools, users } from "../db/schema.js";
import { erpRolePermissions, erpRoles, erpUserRoles } from "../db/schema/erp/core.js";
import { isErpPermission, type ErpPermission } from "@learningopk/shared";
import { logger } from "../logger.js";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  permissions: Set<string>;
  expiresAt: number;
};

const permissionCache = new Map<number, Map<string, CacheEntry>>();

export function invalidateSchoolPermissions(schoolId?: number, userId?: string): void {
  if (schoolId === undefined && userId === undefined) {
    permissionCache.clear();
    return;
  }
  if (schoolId === undefined) {
    // User invalidation across every school.
    for (const [sid, userMap] of permissionCache) {
      if (userMap.delete(userId as string) && userMap.size === 0) {
        permissionCache.delete(sid);
      }
    }
    return;
  }
  if (userId === undefined) {
    permissionCache.delete(schoolId);
    return;
  }
  permissionCache.get(schoolId)?.delete(userId);
}

export type ErpAccessContext = {
  userId: string;
  userRole: "student" | "teacher" | "admin" | "moderator";
  schoolId: number;
  /** Platform admin (Gauzy SUPER_ADMIN analog) — bypasses permission checks */
  isPlatformAdmin: boolean;
  /** schools.adminUserId == user (principal) — implicit full ERP access */
  isSchoolAdmin: boolean;
  permissions: Set<string>;
};

/**
 * Resolve the ERP access context for a user within a school.
 * Mirrors Gauzy's RequestContext: platform admin or org owner get everything;
 * everyone else gets the union of their role permissions.
 */
export async function resolveErpAccess(
  userId: string,
  schoolId: number,
  userRole: ErpAccessContext["userRole"]
): Promise<ErpAccessContext | null> {
  const schoolRows = await db
    .select({ adminUserId: schools.adminUserId })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  const school = schoolRows[0];
  if (!school) return null;

  const isPlatformAdmin = userRole === "admin";
  const isSchoolAdmin = school.adminUserId === userId;

  if (isPlatformAdmin || isSchoolAdmin) {
    // Full access — return an "all permissions" marker set lazily: we keep an
    // empty set and treat isPlatformAdmin/isSchoolAdmin as implicit grants.
    return {
      userId,
      userRole,
      schoolId,
      isPlatformAdmin,
      isSchoolAdmin,
      permissions: new Set<string>(),
    };
  }

  const cached = permissionCache.get(schoolId)?.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      userId,
      userRole,
      schoolId,
      isPlatformAdmin: false,
      isSchoolAdmin: false,
      permissions: cached.permissions,
    };
  }

  const rows = await db
    .select({ permission: erpRolePermissions.permission })
    .from(erpUserRoles)
    .innerJoin(erpRoles, eq(erpRoles.id, erpUserRoles.roleId))
    .innerJoin(
      erpRolePermissions,
      and(eq(erpRolePermissions.roleId, erpRoles.id), eq(erpRolePermissions.enabled, true))
    )
    .where(and(eq(erpUserRoles.schoolId, schoolId), eq(erpUserRoles.userId, userId)));

  const permissions = new Set<string>(rows.map((r) => r.permission));
  let userCache = permissionCache.get(schoolId);
  if (!userCache) {
    userCache = new Map<string, CacheEntry>();
    permissionCache.set(schoolId, userCache);
  }
  userCache.set(userId, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });

  return {
    userId,
    userRole,
    schoolId,
    isPlatformAdmin: false,
    isSchoolAdmin: false,
    permissions,
  };
}

export function hasPermission(access: ErpAccessContext, permission: ErpPermission): boolean {
  if (access.isPlatformAdmin || access.isSchoolAdmin) return true;
  return access.permissions.has(permission);
}

export async function seedSystemRolesForSchool(schoolId: number): Promise<void> {
  const { ERP_SYSTEM_ROLES } = await import("@learningopk/shared");

  for (const role of ERP_SYSTEM_ROLES) {
    const existing = await db
      .select({ id: erpRoles.id })
      .from(erpRoles)
      .where(and(eq(erpRoles.schoolId, schoolId), eq(erpRoles.key, role.key)))
      .limit(1);

    if (existing[0]) continue;

    const inserted = await db
      .insert(erpRoles)
      .values({
        schoolId,
        key: role.key,
        name: role.name,
        description: role.description,
        isSystem: true,
      })
      .returning({ id: erpRoles.id });

    const roleId = inserted[0]?.id;
    if (!roleId) continue;

    await db
      .insert(erpRolePermissions)
      .values(
        role.permissions
          .filter(isErpPermission)
          .map((permission) => ({ roleId, permission, enabled: true }))
      );
  }
}

/**
 * List of schools where the user has any ERP foothold: owns, administers, or
 * holds a role. Used by /api/erp/schools to pick the working school.
 */
export async function listErpSchoolIds(userId: string): Promise<number[]> {
  const owned = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.adminUserId, userId));

  const member = await db
    .selectDistinct({ schoolId: erpUserRoles.schoolId })
    .from(erpUserRoles)
    .where(eq(erpUserRoles.userId, userId));

  return Array.from(new Set([...owned.map((o) => o.id), ...member.map((m) => m.schoolId)]));
}

/** Employee profile (if any) for the user in a school — used by HRM self-service. */
export async function findEmployeeByUserId(
  userId: string,
  schoolId: number
): Promise<{ id: number } | null> {
  const { erpEmployees } = await import("../db/schema/erp/hrm.js");
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.userId, userId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function usersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids));
}

export function logErpAudit(event: string, data: Record<string, unknown>): void {
  logger.info({ module: "erp", event, ...data }, "erp-audit");
}
