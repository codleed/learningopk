/**
 * Employee Functions
 */

import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import {
  erpAttendanceRecords,
  erpDepartments,
  erpEmployees,
  erpPositions,
  erpSalaryStructures,
} from "../../../db/schema/erp/hrm.js";
import { ERP_EMPLOYMENT_TYPES } from "@learningopk/shared";
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

export const employeeBodySchema = z.object({
  userId: z.string().min(1).nullable().optional(),
  employeeCode: z.string().min(1).max(40).optional(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  workEmail: z.email().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  avatarUrl: z.url().max(500).nullable().optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  positionId: z.number().int().positive().nullable().optional(),
  employmentType: z.enum(ERP_EMPLOYMENT_TYPES).optional(),
  joinedAt: z.iso.date().nullable().optional(),
  endedAt: z.iso.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const employeeUpdateSchema = employeeBodySchema.partial();

export type EmployeeInput = z.infer<typeof employeeBodySchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export const salaryStructureBodySchema = z.object({
  basicSalary: z.number().min(0).max(99_999_999.99),
  components: z.record(z.string().min(1).max(80), z.number().min(0).max(99_999_999.99)).optional(),
  currency: z.string().min(1).max(8).optional(),
  effectiveFrom: z.iso.date(),
});

export type SalaryStructureInput = z.infer<typeof salaryStructureBodySchema>;

export interface Employee {
  id: number;
  schoolId: number;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  phone: string | null;
  avatarUrl: string | null;
  departmentId: number | null;
  positionId: number | null;
  employmentType: string;
  joinedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeWithRelations extends Employee {
  department: { id: number; name: string } | null;
  position: { id: number; name: string } | null;
  salaryStructure: SalaryStructure | null;
}

export interface SalaryStructure {
  id: number;
  schoolId: number;
  employeeId: number;
  currency: string;
  basicSalary: string;
  components: Record<string, number>;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeListParams extends PaginationParams {
  search?: string;
  departmentId?: number;
  active?: boolean;
}

export interface EmployeeListResult extends PaginatedResult<
  Employee & {
    departmentName: string | null;
    positionName: string | null;
  }
> {}

// ============================================================================
// Helpers
// ============================================================================

const money = (value: number): string => value.toFixed(2);

async function generateEmployeeCode(schoolId: number): Promise<string> {
  const rows = await db
    .select({ code: erpEmployees.employeeCode })
    .from(erpEmployees)
    .where(eq(erpEmployees.schoolId, schoolId));
  const existing = new Set(rows.map((row) => row.code));
  const base = rows.length + 1;
  for (let candidate = base; candidate <= base + rows.length + 1; candidate += 1) {
    const code = `EMP-${candidate}`;
    if (!existing.has(code)) return code;
  }
  return `EMP-${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function employeeExistsInSchool(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

function firstQueryValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

function parseIdQuery(value: unknown): number | null {
  const raw = firstQueryValue(value);
  if (raw === null || !raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function escapeLikePattern(search: string): string {
  return search.replace(/[%_\\]/g, (char) => `\\${char}`);
}

// ============================================================================
// Functions
// ============================================================================

async function listEmployees(
  context: HrmFunctionContext,
  params: EmployeeListParams
): Promise<EmployeeListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const filters = [eq(erpEmployees.schoolId, context.schoolId)];

  if (params.search?.trim()) {
    const safeSearch = escapeLikePattern(params.search.trim());
    const pattern = `%${safeSearch}%`;
    filters.push(
      or(
        ilike(erpEmployees.firstName, pattern),
        ilike(erpEmployees.lastName, pattern),
        ilike(erpEmployees.employeeCode, pattern)
      )!
    );
  }

  if (params.departmentId !== undefined) {
    filters.push(eq(erpEmployees.departmentId, params.departmentId));
  }

  if (params.active !== undefined) {
    filters.push(eq(erpEmployees.isActive, params.active));
  }

  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: erpEmployees.id,
        userId: erpEmployees.userId,
        employeeCode: erpEmployees.employeeCode,
        firstName: erpEmployees.firstName,
        lastName: erpEmployees.lastName,
        workEmail: erpEmployees.workEmail,
        phone: erpEmployees.phone,
        avatarUrl: erpEmployees.avatarUrl,
        departmentId: erpEmployees.departmentId,
        departmentName: erpDepartments.name,
        positionId: erpEmployees.positionId,
        positionName: erpPositions.name,
        employmentType: erpEmployees.employmentType,
        joinedAt: erpEmployees.joinedAt,
        endedAt: erpEmployees.endedAt,
        isActive: erpEmployees.isActive,
        createdAt: erpEmployees.createdAt,
      })
      .from(erpEmployees)
      .leftJoin(
        erpDepartments,
        and(
          eq(erpDepartments.id, erpEmployees.departmentId),
          eq(erpDepartments.schoolId, context.schoolId)
        )
      )
      .leftJoin(
        erpPositions,
        and(
          eq(erpPositions.id, erpEmployees.positionId),
          eq(erpPositions.schoolId, context.schoolId)
        )
      )
      .where(where)
      .orderBy(desc(erpEmployees.createdAt), desc(erpEmployees.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(erpEmployees).where(where),
  ]);

  return {
    items: rows as EmployeeListResult["items"],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function createEmployee(
  context: HrmFunctionContext,
  input: EmployeeInput
): Promise<Employee> {
  const parsed = employeeBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid employee", parsed.error.flatten());
  }
  const body = parsed.data;

  if (body.userId !== undefined && body.userId !== null) {
    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);
    if (!userRow[0]) {
      throw HrmError.notFound("User", body.userId);
    }
  }

  if (body.departmentId !== undefined && body.departmentId !== null) {
    const department = await db
      .select({ id: erpDepartments.id })
      .from(erpDepartments)
      .where(
        and(eq(erpDepartments.id, body.departmentId), eq(erpDepartments.schoolId, context.schoolId))
      )
      .limit(1);
    if (!department[0]) {
      throw HrmError.notFound("Department", body.departmentId);
    }
  }

  if (body.positionId !== undefined && body.positionId !== null) {
    const position = await db
      .select({ id: erpPositions.id })
      .from(erpPositions)
      .where(and(eq(erpPositions.id, body.positionId), eq(erpPositions.schoolId, context.schoolId)))
      .limit(1);
    if (!position[0]) {
      throw HrmError.notFound("Position", body.positionId);
    }
  }

  let employeeCode = body.employeeCode;
  if (employeeCode) {
    const existing = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(
        and(
          eq(erpEmployees.schoolId, context.schoolId),
          eq(erpEmployees.employeeCode, employeeCode)
        )
      )
      .limit(1);
    if (existing[0]) {
      throw HrmError.conflict("Employee", "employeeCode");
    }
  } else {
    employeeCode = await generateEmployeeCode(context.schoolId);
  }

  const inserted = await db
    .insert(erpEmployees)
    .values({
      schoolId: context.schoolId,
      userId: body.userId ?? null,
      employeeCode,
      firstName: body.firstName,
      lastName: body.lastName,
      workEmail: body.workEmail ?? null,
      phone: body.phone ?? null,
      avatarUrl: body.avatarUrl ?? null,
      departmentId: body.departmentId ?? null,
      positionId: body.positionId ?? null,
      employmentType: body.employmentType ?? "full_time",
      joinedAt: body.joinedAt ?? null,
      endedAt: body.endedAt ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  const employee = inserted[0];
  if (!employee) {
    throw HrmError.internal("Failed to create employee");
  }

  return employee as Employee;
}

async function getEmployee(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<EmployeeWithRelations> {
  const rows = await db
    .select({
      id: erpEmployees.id,
      schoolId: erpEmployees.schoolId,
      userId: erpEmployees.userId,
      employeeCode: erpEmployees.employeeCode,
      firstName: erpEmployees.firstName,
      lastName: erpEmployees.lastName,
      workEmail: erpEmployees.workEmail,
      phone: erpEmployees.phone,
      avatarUrl: erpEmployees.avatarUrl,
      departmentId: erpEmployees.departmentId,
      departmentName: erpDepartments.name,
      positionId: erpEmployees.positionId,
      positionName: erpPositions.name,
      employmentType: erpEmployees.employmentType,
      joinedAt: erpEmployees.joinedAt,
      endedAt: erpEmployees.endedAt,
      isActive: erpEmployees.isActive,
      notes: erpEmployees.notes,
      createdAt: erpEmployees.createdAt,
      updatedAt: erpEmployees.updatedAt,
    })
    .from(erpEmployees)
    .leftJoin(
      erpDepartments,
      and(
        eq(erpDepartments.id, erpEmployees.departmentId),
        eq(erpDepartments.schoolId, context.schoolId)
      )
    )
    .leftJoin(
      erpPositions,
      and(eq(erpPositions.id, erpEmployees.positionId), eq(erpPositions.schoolId, context.schoolId))
    )
    .where(and(eq(erpEmployees.id, args.id), eq(erpEmployees.schoolId, context.schoolId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw HrmError.notFound("Employee", args.id);
  }

  const structureRows = await db
    .select()
    .from(erpSalaryStructures)
    .where(
      and(
        eq(erpSalaryStructures.employeeId, args.id),
        eq(erpSalaryStructures.schoolId, context.schoolId),
        eq(erpSalaryStructures.isActive, true)
      )
    )
    .orderBy(desc(erpSalaryStructures.effectiveFrom), desc(erpSalaryStructures.id))
    .limit(1);

  return {
    ...row,
    department:
      row.departmentId !== null ? { id: row.departmentId, name: row.departmentName! } : null,
    position: row.positionId !== null ? { id: row.positionId, name: row.positionName! } : null,
    salaryStructure: structureRows[0] ?? null,
  } as EmployeeWithRelations;
}

async function updateEmployee(
  context: HrmFunctionContext,
  input: { id: number } & EmployeeUpdateInput
): Promise<Employee> {
  const { id, ...body } = input;

  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw HrmError.validation("Invalid employee update", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, id), eq(erpEmployees.schoolId, context.schoolId)))
    .limit(1);
  if (!existing[0]) {
    throw HrmError.notFound("Employee", id);
  }

  if (body.employeeCode !== undefined) {
    const conflict = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(
        and(
          eq(erpEmployees.schoolId, context.schoolId),
          eq(erpEmployees.employeeCode, body.employeeCode)
        )
      )
      .limit(1);
    if (conflict[0] && conflict[0].id !== id) {
      throw HrmError.conflict("Employee", "employeeCode");
    }
  }

  if (body.userId !== undefined && body.userId !== null) {
    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);
    if (!userRow[0]) {
      throw HrmError.notFound("User", body.userId);
    }
  }

  if (body.departmentId !== undefined && body.departmentId !== null) {
    const department = await db
      .select({ id: erpDepartments.id })
      .from(erpDepartments)
      .where(
        and(eq(erpDepartments.id, body.departmentId), eq(erpDepartments.schoolId, context.schoolId))
      )
      .limit(1);
    if (!department[0]) {
      throw HrmError.notFound("Department", body.departmentId);
    }
  }

  if (body.positionId !== undefined && body.positionId !== null) {
    const position = await db
      .select({ id: erpPositions.id })
      .from(erpPositions)
      .where(and(eq(erpPositions.id, body.positionId), eq(erpPositions.schoolId, context.schoolId)))
      .limit(1);
    if (!position[0]) {
      throw HrmError.notFound("Position", body.positionId);
    }
  }

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (body.userId !== undefined) updateData.userId = body.userId ?? null;
  if (body.employeeCode !== undefined) updateData.employeeCode = body.employeeCode;
  if (body.firstName !== undefined) updateData.firstName = body.firstName;
  if (body.lastName !== undefined) updateData.lastName = body.lastName;
  if (body.workEmail !== undefined) updateData.workEmail = body.workEmail ?? null;
  if (body.phone !== undefined) updateData.phone = body.phone ?? null;
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl ?? null;
  if (body.departmentId !== undefined) updateData.departmentId = body.departmentId ?? null;
  if (body.positionId !== undefined) updateData.positionId = body.positionId ?? null;
  if (body.employmentType !== undefined) updateData.employmentType = body.employmentType;
  if (body.joinedAt !== undefined) updateData.joinedAt = body.joinedAt ?? null;
  if (body.endedAt !== undefined) updateData.endedAt = body.endedAt ?? null;
  if (body.notes !== undefined) updateData.notes = body.notes ?? null;

  const updated = await db
    .update(erpEmployees)
    .set(updateData)
    .where(and(eq(erpEmployees.id, id), eq(erpEmployees.schoolId, context.schoolId)))
    .returning();

  const employee = updated[0];
  if (!employee) {
    throw HrmError.notFound("Employee", id);
  }

  return employee as Employee;
}

async function deleteEmployee(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const today = new Date().toISOString().slice(0, 10);
  const updated = await db
    .update(erpEmployees)
    .set({
      isActive: false,
      endedAt: sql`coalesce(${erpEmployees.endedAt}, ${today})`,
      updatedAt: new Date(),
    })
    .where(and(eq(erpEmployees.id, args.id), eq(erpEmployees.schoolId, context.schoolId)))
    .returning({ id: erpEmployees.id });

  if (updated.length === 0) {
    throw HrmError.notFound("Employee", args.id);
  }

  return { deleted: true };
}

async function createSalaryStructure(
  context: HrmFunctionContext,
  input: { employeeId: number } & SalaryStructureInput
): Promise<SalaryStructure> {
  const { employeeId, ...body } = input;

  const parsed = salaryStructureBodySchema.safeParse(body);
  if (!parsed.success) {
    throw HrmError.validation("Invalid salary structure", parsed.error.flatten());
  }

  if (!(await employeeExistsInSchool(context.schoolId, employeeId))) {
    throw HrmError.notFound("Employee", employeeId);
  }

  const salaryStructure = await db.transaction(async (tx) => {
    await tx
      .update(erpSalaryStructures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(erpSalaryStructures.schoolId, context.schoolId),
          eq(erpSalaryStructures.employeeId, employeeId),
          eq(erpSalaryStructures.isActive, true)
        )
      );

    const inserted = await tx
      .insert(erpSalaryStructures)
      .values({
        schoolId: context.schoolId,
        employeeId,
        currency: parsed.data.currency ?? "PKR",
        basicSalary: money(parsed.data.basicSalary),
        components: parsed.data.components ?? {},
        effectiveFrom: parsed.data.effectiveFrom,
        isActive: true,
      })
      .returning();
    return inserted[0] ?? null;
  });

  if (!salaryStructure) {
    throw HrmError.internal("Failed to create salary structure");
  }

  return salaryStructure as SalaryStructure;
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listEmployees",
  listEmployees,
  "EMPLOYEES_VIEW",
  "List employees with pagination, search, and filters"
);

registerHrmFunction("createEmployee", createEmployee, "EMPLOYEES_MANAGE", "Create a new employee");

registerHrmFunction(
  "getEmployee",
  getEmployee,
  "EMPLOYEES_VIEW",
  "Get a single employee with relations"
);

registerHrmFunction("updateEmployee", updateEmployee, "EMPLOYEES_MANAGE", "Update an employee");

registerHrmFunction(
  "deleteEmployee",
  deleteEmployee,
  "EMPLOYEES_MANAGE",
  "Deactivate an employee (soft delete)"
);

registerHrmFunction(
  "createSalaryStructure",
  createSalaryStructure,
  "PAYROLL_MANAGE",
  "Create a salary structure for an employee"
);
