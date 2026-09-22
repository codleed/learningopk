import { and, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../../lib/db/index.js";
import { schools, users } from "../../lib/db/schema.js";
import { erpRolePermissions, erpRoles, erpUserRoles } from "../../lib/db/schema/erp/core.js";
import { ERP_PERMISSIONS, ERP_SYSTEM_ROLES, isErpPermission } from "@learningopk/shared";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";
import {
  invalidateSchoolPermissions,
  listErpSchoolIds,
  resolveErpAccess,
  seedSystemRolesForSchool,
} from "../../lib/erp/permissions.js";

export const erpCoreRouter = Router();

// GET /api/erp/schools — schools where the user has ERP access + permissions
erpCoreRouter.get("/schools", requireSession, async (req, res) => {
  const authedReq = req as ErpRequest;
  const userId = authedReq.session.user.id;

  const schoolIds = await listErpSchoolIds(userId);
  // Platform admins can see all schools
  if (authedReq.userRole === "admin") {
    const all = await db
      .select({ id: schools.id, name: schools.name, slug: schools.slug, board: schools.board })
      .from(schools);
    for (const s of all) {
      if (!schoolIds.includes(s.id)) schoolIds.push(s.id);
    }
  }

  if (schoolIds.length === 0) {
    res.status(200).json(successResponse({ schools: [] }));
    return;
  }

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      board: schools.board,
      adminUserId: schools.adminUserId,
    })
    .from(schools)
    .where(inArray(schools.id, schoolIds));

  const result = await Promise.all(
    rows.map(async (school) => {
      const access = await resolveErpAccess(userId, school.id, authedReq.userRole);
      return {
        ...school,
        isOwner: school.adminUserId === userId,
        isAdmin: (access?.isPlatformAdmin ?? false) || school.adminUserId === userId,
        permissions: access
          ? access.isPlatformAdmin || access.isSchoolAdmin
            ? [...ERP_PERMISSIONS]
            : [...access.permissions]
          : [],
      };
    })
  );

  res.status(200).json(successResponse({ schools: result }));
});

// GET /api/erp/permissions — the permission catalogue for UI editors
erpCoreRouter.get("/permissions", requireSession, (_req, res) => {
  res
    .status(200)
    .json(successResponse({ permissions: ERP_PERMISSIONS, systemRoles: ERP_SYSTEM_ROLES }));
});

// GET /api/erp/roles — roles with permission matrix for the school
erpCoreRouter.get("/roles", requireSession, erpGuard("ROLES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const roleRows = await db
    .select()
    .from(erpRoles)
    .where(eq(erpRoles.schoolId, schoolId))
    .orderBy(erpRoles.id);

  const permissionRows =
    roleRows.length > 0
      ? await db
          .select({
            roleId: erpRolePermissions.roleId,
            permission: erpRolePermissions.permission,
            enabled: erpRolePermissions.enabled,
          })
          .from(erpRolePermissions)
          .where(
            inArray(
              erpRolePermissions.roleId,
              roleRows.map((r) => r.id)
            )
          )
      : [];

  const roles = roleRows.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: permissionRows
      .filter((p) => p.roleId === role.id && p.enabled)
      .map((p) => p.permission),
  }));

  res.status(200).json(successResponse({ roles }));
});

const roleBodySchema = z.object({
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  permissions: z.array(z.string().refine(isErpPermission)).max(100),
});

// POST /api/erp/roles — create a custom role with permissions
erpCoreRouter.post("/roles", requireSession, erpGuard("ROLES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = roleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid role", "VALIDATION_ERROR"));
    return;
  }

  const { key, name, description, permissions } = parsed.data;

  const existing = await db
    .select({ id: erpRoles.id })
    .from(erpRoles)
    .where(and(eq(erpRoles.schoolId, schoolId), eq(erpRoles.key, key)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Role key already exists", "ROLE_EXISTS"));
    return;
  }

  const inserted = await db
    .insert(erpRoles)
    .values({ schoolId, key, name, description, isSystem: false })
    .returning({ id: erpRoles.id });
  const roleId = inserted[0]?.id;
  if (!roleId) {
    res.status(500).json(errorResponse("Failed to create role", "INTERNAL_ERROR"));
    return;
  }

  if (permissions.length > 0) {
    await db
      .insert(erpRolePermissions)
      .values(permissions.map((permission) => ({ roleId, permission, enabled: true })));
  }

  invalidateSchoolPermissions(schoolId);
  res.status(201).json(successResponse({ roleId }));
});

// PUT /api/erp/roles/:id — update role name/permissions (system roles: permissions only)
erpCoreRouter.put("/roles/:id", requireSession, erpGuard("ROLES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const roleIdParam = req.params.id;
  const roleId = typeof roleIdParam === "string" ? Number.parseInt(roleIdParam, 10) : Number.NaN;
  if (!Number.isSafeInteger(roleId) || roleId <= 0) {
    res.status(400).json(errorResponse("Invalid role ID", "VALIDATION_ERROR"));
    return;
  }

  const bodySchema = z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    permissions: z.array(z.string().refine(isErpPermission)).max(100).optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid role update", "VALIDATION_ERROR"));
    return;
  }

  const roleRows = await db
    .select()
    .from(erpRoles)
    .where(and(eq(erpRoles.id, roleId), eq(erpRoles.schoolId, schoolId)))
    .limit(1);
  const role = roleRows[0];
  if (!role) {
    res.status(404).json(errorResponse("Role not found", "ROLE_NOT_FOUND"));
    return;
  }

  const { name, description, permissions } = parsed.data;

  await db.transaction(async (tx) => {
    if (name !== undefined || description !== undefined) {
      await tx
        .update(erpRoles)
        .set({
          ...(name !== undefined && !role.isSystem ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date(),
        })
        .where(eq(erpRoles.id, roleId));
    }

    if (permissions !== undefined) {
      await tx.delete(erpRolePermissions).where(eq(erpRolePermissions.roleId, roleId));
      if (permissions.length > 0) {
        await tx
          .insert(erpRolePermissions)
          .values(permissions.map((permission) => ({ roleId, permission, enabled: true })));
      }
    }
  });

  invalidateSchoolPermissions(schoolId);
  res.status(200).json(successResponse({ updated: true }));
});

// DELETE /api/erp/roles/:id — custom roles only
erpCoreRouter.delete("/roles/:id", requireSession, erpGuard("ROLES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const roleIdParam = req.params.id;
  const roleId = typeof roleIdParam === "string" ? Number.parseInt(roleIdParam, 10) : Number.NaN;
  if (!Number.isSafeInteger(roleId) || roleId <= 0) {
    res.status(400).json(errorResponse("Invalid role ID", "VALIDATION_ERROR"));
    return;
  }

  const roleRows = await db
    .select()
    .from(erpRoles)
    .where(and(eq(erpRoles.id, roleId), eq(erpRoles.schoolId, schoolId)))
    .limit(1);
  const role = roleRows[0];
  if (!role) {
    res.status(404).json(errorResponse("Role not found", "ROLE_NOT_FOUND"));
    return;
  }
  if (role.isSystem) {
    res.status(400).json(errorResponse("System roles cannot be deleted", "SYSTEM_ROLE"));
    return;
  }

  await db.delete(erpRoles).where(eq(erpRoles.id, roleId));
  invalidateSchoolPermissions(schoolId);
  res.status(200).json(successResponse({ deleted: true }));
});

// GET /api/erp/roles/:id/members — users holding a role
erpCoreRouter.get(
  "/roles/:id/members",
  requireSession,
  erpGuard("ROLES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const roleIdParam = req.params.id;
    const roleId = typeof roleIdParam === "string" ? Number.parseInt(roleIdParam, 10) : Number.NaN;
    if (!Number.isSafeInteger(roleId) || roleId <= 0) {
      res.status(400).json(errorResponse("Invalid role ID", "VALIDATION_ERROR"));
      return;
    }

    const rows = await db
      .select({
        userId: erpUserRoles.userId,
        name: users.name,
        email: users.email,
        assignedAt: erpUserRoles.createdAt,
      })
      .from(erpUserRoles)
      .innerJoin(users, eq(users.id, erpUserRoles.userId))
      .where(and(eq(erpUserRoles.schoolId, schoolId), eq(erpUserRoles.roleId, roleId)));

    res.status(200).json(successResponse({ members: rows }));
  }
);

// POST /api/erp/roles/assign — assign a role to a user (multiple roles allowed)
erpCoreRouter.post("/roles/assign", requireSession, erpGuard("ROLES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const bodySchema = z.object({
    userId: z.string().min(1),
    roleIds: z.array(z.number().int().positive()).min(1).max(10),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid assignment", "VALIDATION_ERROR"));
    return;
  }
  const { userId, roleIds } = parsed.data;

  const validRoles = await db
    .select({ id: erpRoles.id })
    .from(erpRoles)
    .where(and(eq(erpRoles.schoolId, schoolId), inArray(erpRoles.id, roleIds)));
  if (validRoles.length !== roleIds.length) {
    res.status(400).json(errorResponse("Some roles do not exist in this school", "ROLE_NOT_FOUND"));
    return;
  }

  // Replace the user's role set in this school with the provided set
  await db.transaction(async (tx) => {
    await tx
      .delete(erpUserRoles)
      .where(and(eq(erpUserRoles.schoolId, schoolId), eq(erpUserRoles.userId, userId)));
    await tx.insert(erpUserRoles).values(roleIds.map((roleId) => ({ schoolId, userId, roleId })));
  });

  invalidateSchoolPermissions(schoolId, userId);
  res.status(200).json(successResponse({ assigned: true }));
});

// POST /api/erp/roles/seed — (re)seed system roles for the school (idempotent)
erpCoreRouter.post("/roles/seed", requireSession, erpGuard("ROLES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  await seedSystemRolesForSchool(erpReq.schoolId!);
  invalidateSchoolPermissions(erpReq.schoolId!);
  res.status(200).json(successResponse({ seeded: true }));
});
