/**
 * Department Functions
 */

import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { erpDepartments } from "../../../db/schema/erp/hrm.js";
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

export const departmentBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
});

export type DepartmentInput = z.infer<typeof departmentBodySchema>;

export interface Department {
  id: number;
  schoolId: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentListResult extends PaginatedResult<Department> {}

// ============================================================================
// Functions
// ============================================================================

async function listDepartments(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<DepartmentListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(erpDepartments)
      .where(eq(erpDepartments.schoolId, context.schoolId))
      .orderBy(asc(erpDepartments.name))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(erpDepartments)
      .where(eq(erpDepartments.schoolId, context.schoolId)),
  ]);

  return {
    items: rows as Department[],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function createDepartment(
  context: HrmFunctionContext,
  input: DepartmentInput
): Promise<Department> {
  const parsed = departmentBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid department", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpDepartments.id })
    .from(erpDepartments)
    .where(
      and(eq(erpDepartments.schoolId, context.schoolId), eq(erpDepartments.name, parsed.data.name))
    )
    .limit(1);

  if (existing[0]) {
    throw HrmError.conflict("Department", "name");
  }

  const inserted = await db
    .insert(erpDepartments)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  const department = inserted[0];
  if (!department) {
    throw HrmError.internal("Failed to create department");
  }

  return department as Department;
}

async function deleteDepartment(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const deleted = await db
    .delete(erpDepartments)
    .where(and(eq(erpDepartments.id, args.id), eq(erpDepartments.schoolId, context.schoolId)))
    .returning({ id: erpDepartments.id });

  if (deleted.length === 0) {
    throw HrmError.notFound("Department", args.id);
  }

  return { deleted: true };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listDepartments",
  listDepartments,
  "EMPLOYEES_VIEW",
  "List all departments for a school"
);

registerHrmFunction(
  "createDepartment",
  createDepartment,
  "DEPARTMENTS_MANAGE",
  "Create a new department"
);

registerHrmFunction(
  "deleteDepartment",
  deleteDepartment,
  "DEPARTMENTS_MANAGE",
  "Delete a department"
);
