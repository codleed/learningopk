/**
 * Position Functions
 */

import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { erpDepartments, erpPositions } from "../../../db/schema/erp/hrm.js";
import {
  registerHrmFunction,
  type HrmFunctionContext,
  type PaginationParams,
  type PaginatedResult,
  HrmError,
  normalizePagination,
} from "./types.js";

// ============================================================================
// Schemas & Types
// ============================================================================

export const positionBodySchema = z.object({
  name: z.string().min(1).max(120),
  departmentId: z.number().int().positive().nullable().optional(),
});

export type PositionInput = z.infer<typeof positionBodySchema>;

export interface Position {
  id: number;
  schoolId: number;
  name: string;
  departmentId: number | null;
  createdAt: Date;
}

export interface PositionWithDepartment extends Position {
  departmentName: string | null;
}

export interface PositionListResult extends PaginatedResult<PositionWithDepartment> {}

// ============================================================================
// Functions
// ============================================================================

async function listPositions(
  context: HrmFunctionContext,
  params: PaginationParams & { departmentId?: number }
): Promise<PositionListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const filters = [eq(erpPositions.schoolId, context.schoolId)];
  if (params.departmentId !== undefined) {
    filters.push(eq(erpPositions.departmentId, params.departmentId));
  }

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: erpPositions.id,
        name: erpPositions.name,
        departmentId: erpPositions.departmentId,
        departmentName: erpDepartments.name,
        createdAt: erpPositions.createdAt,
      })
      .from(erpPositions)
      .leftJoin(
        erpDepartments,
        and(
          eq(erpDepartments.id, erpPositions.departmentId),
          eq(erpDepartments.schoolId, context.schoolId)
        )
      )
      .where(and(...filters))
      .orderBy(asc(erpPositions.name))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(erpPositions)
      .where(and(...filters)),
  ]);

  return {
    items: rows as PositionWithDepartment[],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function createPosition(
  context: HrmFunctionContext,
  input: PositionInput
): Promise<Position> {
  const parsed = positionBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid position", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpPositions.id })
    .from(erpPositions)
    .where(
      and(eq(erpPositions.schoolId, context.schoolId), eq(erpPositions.name, parsed.data.name))
    )
    .limit(1);

  if (existing[0]) {
    throw HrmError.conflict("Position", "name");
  }

  if (parsed.data.departmentId !== undefined && parsed.data.departmentId !== null) {
    const department = await db
      .select({ id: erpDepartments.id })
      .from(erpDepartments)
      .where(
        and(
          eq(erpDepartments.id, parsed.data.departmentId),
          eq(erpDepartments.schoolId, context.schoolId)
        )
      )
      .limit(1);
    if (!department[0]) {
      throw HrmError.notFound("Department", parsed.data.departmentId);
    }
  }

  const inserted = await db
    .insert(erpPositions)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      departmentId: parsed.data.departmentId ?? null,
    })
    .returning();

  const position = inserted[0];
  if (!position) {
    throw HrmError.internal("Failed to create position");
  }

  return position as Position;
}

async function deletePosition(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const deleted = await db
    .delete(erpPositions)
    .where(and(eq(erpPositions.id, args.id), eq(erpPositions.schoolId, context.schoolId)))
    .returning({ id: erpPositions.id });

  if (deleted.length === 0) {
    throw HrmError.notFound("Position", args.id);
  }

  return { deleted: true };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listPositions",
  listPositions,
  "EMPLOYEES_VIEW",
  "List all positions for a school, optionally filtered by department"
);

registerHrmFunction(
  "createPosition",
  createPosition,
  "DEPARTMENTS_MANAGE",
  "Create a new position"
);

registerHrmFunction("deletePosition", deletePosition, "DEPARTMENTS_MANAGE", "Delete a position");
