import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, sum } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { ERP_EMPLOYMENT_TYPES, ERP_TIME_OFF_STATUSES } from "@learningopk/shared";

import { db } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import {
  erpAttendanceRecords,
  erpDepartments,
  erpEmployees,
  erpExpenseCategories,
  erpExpenses,
  erpOfficialHolidays,
  erpPayrollRuns,
  erpPayslips,
  erpPositions,
  erpSalaryStructures,
  erpTeamMembers,
  erpTeams,
  erpTimeOffPolicies,
  erpTimeOffRequests,
} from "../../lib/db/schema/erp/hrm.js";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";
import { escapeLikePattern } from "../../lib/escape-like.js";

// Function Calling Dispatcher
import {
  createDispatcher,
  type DispatcherContext,
  dispatchErrorToResponse,
} from "../../lib/erp/functions/dispatcher.js";
import { hrmFunctions } from "../../lib/erp/functions/hrm/index.js";
import hrmSpec from "../../lib/erp/spec/hrm.json" with { type: "json" };

export const erpHrmRouter = Router();

const ATTENDANCE_STATUSES = ["present", "absent", "late", "leave", "half_day"] as const;
const ATTENDANCE_SOURCES = ["manual", "kiosk", "import"] as const;
const EXPENSE_STATUSES = ["submitted", "approved", "rejected", "reimbursed"] as const;

const ATTENDANCE_DATE_SCHEMA = z.iso.date();

function firstQueryValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

function parseIdParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePageQuery(req: ErpRequest): { page: number; pageSize: number; offset: number } {
  const pageValue = Number.parseInt(firstQueryValue(req.query.page) ?? "1", 10);
  const pageSizeValue = Number.parseInt(firstQueryValue(req.query.pageSize) ?? "20", 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize =
    Number.isSafeInteger(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, 100) : 20;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function parseIdQuery(value: unknown): number | null {
  const raw = firstQueryValue(value);
  if (raw === null || !raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidIsoDate(value: string | null): value is string {
  return value !== null && ATTENDANCE_DATE_SCHEMA.safeParse(value).success;
}

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

function money(value: number): string {
  return value.toFixed(2);
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

const departmentBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
});

erpHrmRouter.get("/departments", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const rows = await db
    .select()
    .from(erpDepartments)
    .where(eq(erpDepartments.schoolId, schoolId))
    .orderBy(asc(erpDepartments.name));

  res.status(200).json(successResponse({ departments: rows }));
});

erpHrmRouter.post(
  "/departments",
  requireSession,
  erpGuard("DEPARTMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = departmentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid department", "VALIDATION_ERROR"));
      return;
    }

    const existing = await db
      .select({ id: erpDepartments.id })
      .from(erpDepartments)
      .where(and(eq(erpDepartments.schoolId, schoolId), eq(erpDepartments.name, parsed.data.name)))
      .limit(1);
    if (existing[0]) {
      res.status(409).json(errorResponse("Department already exists", "DEPARTMENT_EXISTS"));
      return;
    }

    const inserted = await db
      .insert(erpDepartments)
      .values({
        schoolId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .returning();
    const department = inserted[0];
    if (!department) {
      res.status(500).json(errorResponse("Failed to create department", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ department }));
  }
);

erpHrmRouter.delete(
  "/departments/:id",
  requireSession,
  erpGuard("DEPARTMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const departmentId = parseIdParam(req.params.id);
    if (!departmentId) {
      res.status(400).json(errorResponse("Invalid department ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpDepartments)
      .where(and(eq(erpDepartments.id, departmentId), eq(erpDepartments.schoolId, schoolId)))
      .returning({ id: erpDepartments.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Department not found", "DEPARTMENT_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------

const positionBodySchema = z.object({
  name: z.string().min(1).max(120),
  departmentId: z.number().int().positive().nullable().optional(),
});

erpHrmRouter.get("/positions", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const filters = [eq(erpPositions.schoolId, schoolId)];
  const departmentIdRaw = firstQueryValue(erpReq.query.departmentId);
  if (departmentIdRaw) {
    const departmentId = parseIdQuery(erpReq.query.departmentId);
    if (!departmentId) {
      res.status(400).json(errorResponse("Invalid department ID", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpPositions.departmentId, departmentId));
  }

  const rows = await db
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
      and(eq(erpDepartments.id, erpPositions.departmentId), eq(erpDepartments.schoolId, schoolId))
    )
    .where(and(...filters))
    .orderBy(asc(erpPositions.name));

  res.status(200).json(successResponse({ positions: rows }));
});

erpHrmRouter.post(
  "/positions",
  requireSession,
  erpGuard("DEPARTMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = positionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid position", "VALIDATION_ERROR"));
      return;
    }

    const existing = await db
      .select({ id: erpPositions.id })
      .from(erpPositions)
      .where(and(eq(erpPositions.schoolId, schoolId), eq(erpPositions.name, parsed.data.name)))
      .limit(1);
    if (existing[0]) {
      res.status(409).json(errorResponse("Position already exists", "POSITION_EXISTS"));
      return;
    }

    if (parsed.data.departmentId !== undefined && parsed.data.departmentId !== null) {
      const department = await db
        .select({ id: erpDepartments.id })
        .from(erpDepartments)
        .where(
          and(
            eq(erpDepartments.id, parsed.data.departmentId),
            eq(erpDepartments.schoolId, schoolId)
          )
        )
        .limit(1);
      if (!department[0]) {
        res.status(400).json(errorResponse("Department not found", "DEPARTMENT_NOT_FOUND"));
        return;
      }
    }

    const inserted = await db
      .insert(erpPositions)
      .values({
        schoolId,
        name: parsed.data.name,
        departmentId: parsed.data.departmentId ?? null,
      })
      .returning();
    const position = inserted[0];
    if (!position) {
      res.status(500).json(errorResponse("Failed to create position", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ position }));
  }
);

erpHrmRouter.delete(
  "/positions/:id",
  requireSession,
  erpGuard("DEPARTMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const positionId = parseIdParam(req.params.id);
    if (!positionId) {
      res.status(400).json(errorResponse("Invalid position ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpPositions)
      .where(and(eq(erpPositions.id, positionId), eq(erpPositions.schoolId, schoolId)))
      .returning({ id: erpPositions.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Position not found", "POSITION_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

const employeeBodySchema = z.object({
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

const employeeUpdateSchema = employeeBodySchema.partial();

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

erpHrmRouter.get("/employees", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePageQuery(erpReq);

  const filters = [eq(erpEmployees.schoolId, schoolId)];

  const search = firstQueryValue(erpReq.query.search)?.trim();
  if (search) {
    const safeSearch = escapeLikePattern(search);
    const pattern = `%${safeSearch}%`;
    filters.push(
      or(
        ilike(erpEmployees.firstName, pattern),
        ilike(erpEmployees.lastName, pattern),
        ilike(erpEmployees.employeeCode, pattern)
      )!
    );
  }

  const departmentIdRaw = firstQueryValue(erpReq.query.departmentId);
  if (departmentIdRaw) {
    const departmentId = parseIdQuery(erpReq.query.departmentId);
    if (!departmentId) {
      res.status(400).json(errorResponse("Invalid department ID", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpEmployees.departmentId, departmentId));
  }

  const activeRaw = firstQueryValue(erpReq.query.active);
  if (activeRaw !== null) {
    if (activeRaw !== "true" && activeRaw !== "false") {
      res.status(400).json(errorResponse("Invalid active filter", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpEmployees.isActive, activeRaw === "true"));
  }

  const where = and(...filters);

  const rows = await db
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
      and(eq(erpDepartments.id, erpEmployees.departmentId), eq(erpDepartments.schoolId, schoolId))
    )
    .leftJoin(
      erpPositions,
      and(eq(erpPositions.id, erpEmployees.positionId), eq(erpPositions.schoolId, schoolId))
    )
    .where(where)
    .orderBy(desc(erpEmployees.createdAt), desc(erpEmployees.id))
    .limit(pageSize)
    .offset(offset);

  const totalRows = await db.select({ value: count() }).from(erpEmployees).where(where);
  const total = Number(totalRows[0]?.value ?? 0);

  res.status(200).json(successResponse({ items: rows, total, page, pageSize }));
});

erpHrmRouter.post("/employees", requireSession, erpGuard("EMPLOYEES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = employeeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid employee", "VALIDATION_ERROR"));
    return;
  }
  const body = parsed.data;

  if (body.userId !== undefined && body.userId !== null) {
    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);
    if (!userRow[0]) {
      res.status(400).json(errorResponse("User not found", "USER_NOT_FOUND"));
      return;
    }
  }

  if (body.departmentId !== undefined && body.departmentId !== null) {
    const department = await db
      .select({ id: erpDepartments.id })
      .from(erpDepartments)
      .where(and(eq(erpDepartments.id, body.departmentId), eq(erpDepartments.schoolId, schoolId)))
      .limit(1);
    if (!department[0]) {
      res.status(400).json(errorResponse("Department not found", "DEPARTMENT_NOT_FOUND"));
      return;
    }
  }

  if (body.positionId !== undefined && body.positionId !== null) {
    const position = await db
      .select({ id: erpPositions.id })
      .from(erpPositions)
      .where(and(eq(erpPositions.id, body.positionId), eq(erpPositions.schoolId, schoolId)))
      .limit(1);
    if (!position[0]) {
      res.status(400).json(errorResponse("Position not found", "POSITION_NOT_FOUND"));
      return;
    }
  }

  let employeeCode = body.employeeCode;
  if (employeeCode) {
    const existing = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.employeeCode, employeeCode)))
      .limit(1);
    if (existing[0]) {
      res.status(409).json(errorResponse("Employee code already exists", "EMPLOYEE_CODE_EXISTS"));
      return;
    }
  } else {
    employeeCode = await generateEmployeeCode(schoolId);
  }

  const inserted = await db
    .insert(erpEmployees)
    .values({
      schoolId,
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
    res.status(500).json(errorResponse("Failed to create employee", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ employee }));
});

erpHrmRouter.get("/employees/:id", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const employeeId = parseIdParam(req.params.id);
  if (!employeeId) {
    res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
    return;
  }

  const rows = await db
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
      notes: erpEmployees.notes,
      createdAt: erpEmployees.createdAt,
      updatedAt: erpEmployees.updatedAt,
    })
    .from(erpEmployees)
    .leftJoin(
      erpDepartments,
      and(eq(erpDepartments.id, erpEmployees.departmentId), eq(erpDepartments.schoolId, schoolId))
    )
    .leftJoin(
      erpPositions,
      and(eq(erpPositions.id, erpEmployees.positionId), eq(erpPositions.schoolId, schoolId))
    )
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
    return;
  }

  const structureRows = await db
    .select()
    .from(erpSalaryStructures)
    .where(
      and(
        eq(erpSalaryStructures.employeeId, employeeId),
        eq(erpSalaryStructures.schoolId, schoolId),
        eq(erpSalaryStructures.isActive, true)
      )
    )
    .orderBy(desc(erpSalaryStructures.effectiveFrom), desc(erpSalaryStructures.id))
    .limit(1);

  const employee = {
    ...row,
    department:
      row.departmentId !== null ? { id: row.departmentId, name: row.departmentName } : null,
    position: row.positionId !== null ? { id: row.positionId, name: row.positionName } : null,
    salaryStructure: structureRows[0] ?? null,
  };

  res.status(200).json(successResponse({ employee }));
});

erpHrmRouter.put(
  "/employees/:id",
  requireSession,
  erpGuard("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const employeeId = parseIdParam(req.params.id);
    if (!employeeId) {
      res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = employeeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid employee update", "VALIDATION_ERROR"));
      return;
    }
    const body = parsed.data;

    const existing = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
      .limit(1);
    if (!existing[0]) {
      res.status(404).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }

    if (body.employeeCode !== undefined) {
      const conflict = await db
        .select({ id: erpEmployees.id })
        .from(erpEmployees)
        .where(
          and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.employeeCode, body.employeeCode))
        )
        .limit(1);
      if (conflict[0] && conflict[0].id !== employeeId) {
        res.status(409).json(errorResponse("Employee code already exists", "EMPLOYEE_CODE_EXISTS"));
        return;
      }
    }

    if (body.userId !== undefined && body.userId !== null) {
      const userRow = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, body.userId))
        .limit(1);
      if (!userRow[0]) {
        res.status(400).json(errorResponse("User not found", "USER_NOT_FOUND"));
        return;
      }
    }

    if (body.departmentId !== undefined && body.departmentId !== null) {
      const department = await db
        .select({ id: erpDepartments.id })
        .from(erpDepartments)
        .where(and(eq(erpDepartments.id, body.departmentId), eq(erpDepartments.schoolId, schoolId)))
        .limit(1);
      if (!department[0]) {
        res.status(400).json(errorResponse("Department not found", "DEPARTMENT_NOT_FOUND"));
        return;
      }
    }

    if (body.positionId !== undefined && body.positionId !== null) {
      const position = await db
        .select({ id: erpPositions.id })
        .from(erpPositions)
        .where(and(eq(erpPositions.id, body.positionId), eq(erpPositions.schoolId, schoolId)))
        .limit(1);
      if (!position[0]) {
        res.status(400).json(errorResponse("Position not found", "POSITION_NOT_FOUND"));
        return;
      }
    }

    const updated = await db
      .update(erpEmployees)
      .set({
        ...(body.userId !== undefined ? { userId: body.userId ?? null } : {}),
        ...(body.employeeCode !== undefined ? { employeeCode: body.employeeCode } : {}),
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.workEmail !== undefined ? { workEmail: body.workEmail ?? null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl ?? null } : {}),
        ...(body.departmentId !== undefined ? { departmentId: body.departmentId ?? null } : {}),
        ...(body.positionId !== undefined ? { positionId: body.positionId ?? null } : {}),
        ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
        ...(body.joinedAt !== undefined ? { joinedAt: body.joinedAt ?? null } : {}),
        ...(body.endedAt !== undefined ? { endedAt: body.endedAt ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
      .returning();
    const employee = updated[0];
    if (!employee) {
      res.status(404).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ employee }));
  }
);

erpHrmRouter.delete(
  "/employees/:id",
  requireSession,
  erpGuard("EMPLOYEES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const employeeId = parseIdParam(req.params.id);
    if (!employeeId) {
      res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const updated = await db
      .update(erpEmployees)
      .set({
        isActive: false,
        endedAt: sql`coalesce(${erpEmployees.endedAt}, ${today})`,
        updatedAt: new Date(),
      })
      .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
      .returning({ id: erpEmployees.id });
    if (updated.length === 0) {
      res.status(404).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------

const salaryStructureBodySchema = z.object({
  basicSalary: z.number().min(0).max(99_999_999.99),
  components: z.record(z.string().min(1).max(80), z.number().min(0).max(99_999_999.99)).optional(),
  currency: z.string().min(1).max(8).optional(),
  effectiveFrom: z.iso.date(),
});

erpHrmRouter.post(
  "/employees/:id/salary-structure",
  requireSession,
  erpGuard("PAYROLL_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const employeeId = parseIdParam(req.params.id);
    if (!employeeId) {
      res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = salaryStructureBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid salary structure", "VALIDATION_ERROR"));
      return;
    }

    if (!(await employeeExistsInSchool(schoolId, employeeId))) {
      res.status(404).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }

    const salaryStructure = await db.transaction(async (tx) => {
      await tx
        .update(erpSalaryStructures)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(erpSalaryStructures.schoolId, schoolId),
            eq(erpSalaryStructures.employeeId, employeeId),
            eq(erpSalaryStructures.isActive, true)
          )
        );

      const inserted = await tx
        .insert(erpSalaryStructures)
        .values({
          schoolId,
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
      res.status(500).json(errorResponse("Failed to create salary structure", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ salaryStructure }));
  }
);

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

const teamBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

const teamMembersBodySchema = z.object({
  members: z
    .array(
      z.object({
        employeeId: z.number().int().positive(),
        isManager: z.boolean().optional(),
      })
    )
    .max(200),
});

erpHrmRouter.get("/teams", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const teamRows = await db
    .select()
    .from(erpTeams)
    .where(eq(erpTeams.schoolId, schoolId))
    .orderBy(asc(erpTeams.name));

  const memberRows =
    teamRows.length > 0
      ? await db
          .select({
            teamId: erpTeamMembers.teamId,
            employeeId: erpTeamMembers.employeeId,
            isManager: erpTeamMembers.isManager,
            firstName: erpEmployees.firstName,
            lastName: erpEmployees.lastName,
            employeeCode: erpEmployees.employeeCode,
          })
          .from(erpTeamMembers)
          .innerJoin(
            erpEmployees,
            and(eq(erpEmployees.id, erpTeamMembers.employeeId), eq(erpEmployees.schoolId, schoolId))
          )
          .where(eq(erpTeamMembers.schoolId, schoolId))
      : [];

  const teams = teamRows.map((team) => ({
    ...team,
    members: memberRows
      .filter((member) => member.teamId === team.id)
      .map((member) => ({
        employeeId: member.employeeId,
        isManager: member.isManager,
        name: fullName(member.firstName, member.lastName),
        employeeCode: member.employeeCode,
      })),
  }));

  res.status(200).json(successResponse({ teams }));
});

erpHrmRouter.post("/teams", requireSession, erpGuard("TEAMS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = teamBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid team", "VALIDATION_ERROR"));
    return;
  }

  const existing = await db
    .select({ id: erpTeams.id })
    .from(erpTeams)
    .where(and(eq(erpTeams.schoolId, schoolId), eq(erpTeams.name, parsed.data.name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Team already exists", "TEAM_EXISTS"));
    return;
  }

  const inserted = await db
    .insert(erpTeams)
    .values({
      schoolId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? null,
    })
    .returning();
  const team = inserted[0];
  if (!team) {
    res.status(500).json(errorResponse("Failed to create team", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ team }));
});

erpHrmRouter.post(
  "/teams/:id/members",
  requireSession,
  erpGuard("TEAMS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const teamId = parseIdParam(req.params.id);
    if (!teamId) {
      res.status(400).json(errorResponse("Invalid team ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = teamMembersBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid team members", "VALIDATION_ERROR"));
      return;
    }
    const members = parsed.data.members;

    const teamRows = await db
      .select({ id: erpTeams.id })
      .from(erpTeams)
      .where(and(eq(erpTeams.id, teamId), eq(erpTeams.schoolId, schoolId)))
      .limit(1);
    if (!teamRows[0]) {
      res.status(404).json(errorResponse("Team not found", "TEAM_NOT_FOUND"));
      return;
    }

    const employeeIds = [...new Set(members.map((member) => member.employeeId))];
    if (employeeIds.length !== members.length) {
      res.status(400).json(errorResponse("Duplicate employee in members", "DUPLICATE_TEAM_MEMBER"));
      return;
    }

    if (employeeIds.length > 0) {
      const validEmployees = await db
        .select({ id: erpEmployees.id })
        .from(erpEmployees)
        .where(and(eq(erpEmployees.schoolId, schoolId), inArray(erpEmployees.id, employeeIds)));
      if (validEmployees.length !== employeeIds.length) {
        res
          .status(400)
          .json(errorResponse("Some employees do not exist in this school", "EMPLOYEE_NOT_FOUND"));
        return;
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(erpTeamMembers)
        .where(and(eq(erpTeamMembers.schoolId, schoolId), eq(erpTeamMembers.teamId, teamId)));
      if (members.length > 0) {
        await tx.insert(erpTeamMembers).values(
          members.map((member) => ({
            schoolId,
            teamId,
            employeeId: member.employeeId,
            isManager: member.isManager ?? false,
          }))
        );
      }
    });

    res.status(200).json(successResponse({ members: employeeIds.length, updated: true }));
  }
);

erpHrmRouter.delete("/teams/:id", requireSession, erpGuard("TEAMS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const teamId = parseIdParam(req.params.id);
  if (!teamId) {
    res.status(400).json(errorResponse("Invalid team ID", "VALIDATION_ERROR"));
    return;
  }

  const deleted = await db
    .delete(erpTeams)
    .where(and(eq(erpTeams.id, teamId), eq(erpTeams.schoolId, schoolId)))
    .returning({ id: erpTeams.id });
  if (deleted.length === 0) {
    res.status(404).json(errorResponse("Team not found", "TEAM_NOT_FOUND"));
    return;
  }
  res.status(200).json(successResponse({ deleted: true }));
});

// ---------------------------------------------------------------------------
// Staff attendance
// ---------------------------------------------------------------------------

const attendanceBodySchema = z.object({
  employeeId: z.number().int().positive(),
  workDate: z.iso.date(),
  status: z.enum(ATTENDANCE_STATUSES),
  checkIn: z.iso.datetime().nullable().optional(),
  checkOut: z.iso.datetime().nullable().optional(),
  source: z.enum(ATTENDANCE_SOURCES).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const attendanceBulkBodySchema = z.object({
  date: z.iso.date(),
  entries: z
    .array(
      z.object({
        employeeId: z.number().int().positive(),
        status: z.enum(ATTENDANCE_STATUSES),
      })
    )
    .min(1)
    .max(500),
});

erpHrmRouter.get("/attendance", requireSession, erpGuard("ATTENDANCE_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePageQuery(erpReq);

  const filters = [eq(erpAttendanceRecords.schoolId, schoolId)];

  const employeeIdRaw = firstQueryValue(erpReq.query.employeeId);
  if (employeeIdRaw) {
    const employeeId = parseIdQuery(erpReq.query.employeeId);
    if (!employeeId) {
      res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpAttendanceRecords.employeeId, employeeId));
  }

  const from = firstQueryValue(erpReq.query.from);
  if (from !== null) {
    if (!isValidIsoDate(from)) {
      res.status(400).json(errorResponse("Invalid from date", "VALIDATION_ERROR"));
      return;
    }
    filters.push(gte(erpAttendanceRecords.workDate, from));
  }

  const to = firstQueryValue(erpReq.query.to);
  if (to !== null) {
    if (!isValidIsoDate(to)) {
      res.status(400).json(errorResponse("Invalid to date", "VALIDATION_ERROR"));
      return;
    }
    filters.push(lte(erpAttendanceRecords.workDate, to));
  }

  const where = and(...filters);

  const rows = await db
    .select({
      id: erpAttendanceRecords.id,
      employeeId: erpAttendanceRecords.employeeId,
      employeeName: sql<string>`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
      employeeCode: erpEmployees.employeeCode,
      workDate: erpAttendanceRecords.workDate,
      checkIn: erpAttendanceRecords.checkIn,
      checkOut: erpAttendanceRecords.checkOut,
      status: erpAttendanceRecords.status,
      source: erpAttendanceRecords.source,
      notes: erpAttendanceRecords.notes,
      createdAt: erpAttendanceRecords.createdAt,
    })
    .from(erpAttendanceRecords)
    .innerJoin(
      erpEmployees,
      and(eq(erpEmployees.id, erpAttendanceRecords.employeeId), eq(erpEmployees.schoolId, schoolId))
    )
    .where(where)
    .orderBy(desc(erpAttendanceRecords.workDate), desc(erpAttendanceRecords.id))
    .limit(pageSize)
    .offset(offset);

  const totalRows = await db.select({ value: count() }).from(erpAttendanceRecords).where(where);
  const total = Number(totalRows[0]?.value ?? 0);

  res.status(200).json(successResponse({ items: rows, total, page, pageSize }));
});

erpHrmRouter.post(
  "/attendance",
  requireSession,
  erpGuard("ATTENDANCE_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = attendanceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid attendance record", "VALIDATION_ERROR"));
      return;
    }
    const body = parsed.data;

    if (!(await employeeExistsInSchool(schoolId, body.employeeId))) {
      res.status(400).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }

    const upserted = await db
      .insert(erpAttendanceRecords)
      .values({
        schoolId,
        employeeId: body.employeeId,
        workDate: body.workDate,
        status: body.status,
        checkIn: body.checkIn ? new Date(body.checkIn) : null,
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        source: body.source ?? "manual",
        notes: body.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [erpAttendanceRecords.employeeId, erpAttendanceRecords.workDate],
        set: {
          status: body.status,
          checkIn: body.checkIn ? new Date(body.checkIn) : null,
          checkOut: body.checkOut ? new Date(body.checkOut) : null,
          source: body.source ?? "manual",
          notes: body.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    const record = upserted[0];
    if (!record) {
      res.status(500).json(errorResponse("Failed to save attendance record", "INTERNAL_ERROR"));
      return;
    }
    res.status(200).json(successResponse({ record }));
  }
);

erpHrmRouter.post(
  "/attendance/bulk",
  requireSession,
  erpGuard("ATTENDANCE_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = attendanceBulkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid bulk attendance", "VALIDATION_ERROR"));
      return;
    }
    const { date, entries } = parsed.data;

    const employeeIds = [...new Set(entries.map((entry) => entry.employeeId))];
    const validEmployees = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(and(eq(erpEmployees.schoolId, schoolId), inArray(erpEmployees.id, employeeIds)));
    if (validEmployees.length !== employeeIds.length) {
      res
        .status(400)
        .json(errorResponse("Some employees do not exist in this school", "EMPLOYEE_NOT_FOUND"));
      return;
    }

    await db
      .insert(erpAttendanceRecords)
      .values(
        entries.map((entry) => ({
          schoolId,
          employeeId: entry.employeeId,
          workDate: date,
          status: entry.status,
          source: "manual",
        }))
      )
      .onConflictDoUpdate({
        target: [erpAttendanceRecords.employeeId, erpAttendanceRecords.workDate],
        set: { status: sql`excluded.status`, updatedAt: new Date() },
      });

    res.status(200).json(successResponse({ upserted: entries.length }));
  }
);

// ---------------------------------------------------------------------------
// Time off
// ---------------------------------------------------------------------------

const timeOffPolicyBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
  paid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  annualDays: z.number().int().min(0).max(365).optional(),
});

const timeOffBodySchema = z.object({
  employeeId: z.number().int().positive(),
  policyId: z.number().int().positive(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  reason: z.string().max(2000).nullable().optional(),
});

const timeOffDecideBodySchema = z.object({
  decision: z.enum(["approved", "refused"]),
});

erpHrmRouter.get(
  "/time-off/policies",
  requireSession,
  erpGuard("TIME_OFF_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const rows = await db
      .select()
      .from(erpTimeOffPolicies)
      .where(eq(erpTimeOffPolicies.schoolId, schoolId))
      .orderBy(asc(erpTimeOffPolicies.name));

    res.status(200).json(successResponse({ policies: rows }));
  }
);

erpHrmRouter.post(
  "/time-off/policies",
  requireSession,
  erpGuard("TIME_OFF_APPROVE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = timeOffPolicyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid time off policy", "VALIDATION_ERROR"));
      return;
    }

    const existing = await db
      .select({ id: erpTimeOffPolicies.id })
      .from(erpTimeOffPolicies)
      .where(
        and(
          eq(erpTimeOffPolicies.schoolId, schoolId),
          eq(erpTimeOffPolicies.name, parsed.data.name)
        )
      )
      .limit(1);
    if (existing[0]) {
      res
        .status(409)
        .json(errorResponse("Time off policy already exists", "TIME_OFF_POLICY_EXISTS"));
      return;
    }

    const inserted = await db
      .insert(erpTimeOffPolicies)
      .values({
        schoolId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        paid: parsed.data.paid ?? true,
        requiresApproval: parsed.data.requiresApproval ?? true,
        annualDays: parsed.data.annualDays ?? 0,
      })
      .returning();
    const policy = inserted[0];
    if (!policy) {
      res.status(500).json(errorResponse("Failed to create time off policy", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ policy }));
  }
);

erpHrmRouter.get("/time-off", requireSession, erpGuard("TIME_OFF_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePageQuery(erpReq);

  const filters = [eq(erpTimeOffRequests.schoolId, schoolId)];

  const status = firstQueryValue(erpReq.query.status);
  if (status !== null) {
    if (!(ERP_TIME_OFF_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json(errorResponse("Invalid status", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpTimeOffRequests.status, status));
  }

  const employeeIdRaw = firstQueryValue(erpReq.query.employeeId);
  if (employeeIdRaw) {
    const employeeId = parseIdQuery(erpReq.query.employeeId);
    if (!employeeId) {
      res.status(400).json(errorResponse("Invalid employee ID", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpTimeOffRequests.employeeId, employeeId));
  }

  const where = and(...filters);

  const rows = await db
    .select({
      id: erpTimeOffRequests.id,
      employeeId: erpTimeOffRequests.employeeId,
      employeeName: sql<string>`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
      policyId: erpTimeOffRequests.policyId,
      policyName: erpTimeOffPolicies.name,
      startDate: erpTimeOffRequests.startDate,
      endDate: erpTimeOffRequests.endDate,
      status: erpTimeOffRequests.status,
      reason: erpTimeOffRequests.reason,
      decidedBy: erpTimeOffRequests.decidedBy,
      decidedAt: erpTimeOffRequests.decidedAt,
      createdAt: erpTimeOffRequests.createdAt,
    })
    .from(erpTimeOffRequests)
    .innerJoin(
      erpEmployees,
      and(eq(erpEmployees.id, erpTimeOffRequests.employeeId), eq(erpEmployees.schoolId, schoolId))
    )
    .leftJoin(
      erpTimeOffPolicies,
      and(
        eq(erpTimeOffPolicies.id, erpTimeOffRequests.policyId),
        eq(erpTimeOffPolicies.schoolId, schoolId)
      )
    )
    .where(where)
    .orderBy(desc(erpTimeOffRequests.createdAt), desc(erpTimeOffRequests.id))
    .limit(pageSize)
    .offset(offset);

  const totalRows = await db.select({ value: count() }).from(erpTimeOffRequests).where(where);
  const total = Number(totalRows[0]?.value ?? 0);

  res.status(200).json(successResponse({ items: rows, total, page, pageSize }));
});

erpHrmRouter.post("/time-off", requireSession, erpGuard("TIME_OFF_REQUEST"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = timeOffBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid time off request", "VALIDATION_ERROR"));
    return;
  }
  const body = parsed.data;

  if (body.startDate > body.endDate) {
    res
      .status(400)
      .json(errorResponse("Start date must not be after end date", "INVALID_DATE_RANGE"));
    return;
  }

  if (!(await employeeExistsInSchool(schoolId, body.employeeId))) {
    res.status(400).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
    return;
  }

  const policyRows = await db
    .select()
    .from(erpTimeOffPolicies)
    .where(and(eq(erpTimeOffPolicies.id, body.policyId), eq(erpTimeOffPolicies.schoolId, schoolId)))
    .limit(1);
  const policy = policyRows[0];
  if (!policy) {
    res.status(400).json(errorResponse("Time off policy not found", "POLICY_NOT_FOUND"));
    return;
  }

  const autoApproved = !policy.requiresApproval;
  const now = new Date();
  const inserted = await db
    .insert(erpTimeOffRequests)
    .values({
      schoolId,
      employeeId: body.employeeId,
      policyId: body.policyId,
      startDate: body.startDate,
      endDate: body.endDate,
      status: autoApproved ? "approved" : "requested",
      reason: body.reason ?? null,
      decidedBy: autoApproved ? erpReq.session.user.id : null,
      decidedAt: autoApproved ? now : null,
    })
    .returning();
  const request = inserted[0];
  if (!request) {
    res.status(500).json(errorResponse("Failed to create time off request", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ request }));
});

erpHrmRouter.put(
  "/time-off/:id/decide",
  requireSession,
  erpGuard("TIME_OFF_APPROVE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const requestId = parseIdParam(req.params.id);
    if (!requestId) {
      res.status(400).json(errorResponse("Invalid request ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = timeOffDecideBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid decision", "VALIDATION_ERROR"));
      return;
    }

    const existing = await db
      .select({ id: erpTimeOffRequests.id, status: erpTimeOffRequests.status })
      .from(erpTimeOffRequests)
      .where(and(eq(erpTimeOffRequests.id, requestId), eq(erpTimeOffRequests.schoolId, schoolId)))
      .limit(1);
    const request = existing[0];
    if (!request) {
      res
        .status(404)
        .json(errorResponse("Time off request not found", "TIME_OFF_REQUEST_NOT_FOUND"));
      return;
    }
    if (request.status !== "requested") {
      res
        .status(400)
        .json(errorResponse("Time off request is already decided", "TIME_OFF_ALREADY_DECIDED"));
      return;
    }

    const now = new Date();
    const updated = await db
      .update(erpTimeOffRequests)
      .set({
        status: parsed.data.decision,
        decidedBy: erpReq.session.user.id,
        decidedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(erpTimeOffRequests.id, requestId),
          eq(erpTimeOffRequests.schoolId, schoolId),
          eq(erpTimeOffRequests.status, "requested")
        )
      )
      .returning();
    const decided = updated[0];
    if (!decided) {
      res
        .status(409)
        .json(errorResponse("Time off request is already decided", "TIME_OFF_ALREADY_DECIDED"));
      return;
    }
    res.status(200).json(successResponse({ request: decided }));
  }
);

// ---------------------------------------------------------------------------
// Official holidays
// ---------------------------------------------------------------------------

const holidayBodySchema = z.object({
  name: z.string().min(1).max(160),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

erpHrmRouter.get("/holidays", requireSession, erpGuard("TIME_OFF_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const rows = await db
    .select()
    .from(erpOfficialHolidays)
    .where(eq(erpOfficialHolidays.schoolId, schoolId))
    .orderBy(asc(erpOfficialHolidays.startDate));

  res.status(200).json(successResponse({ holidays: rows }));
});

erpHrmRouter.post("/holidays", requireSession, erpGuard("TIME_OFF_APPROVE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = holidayBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid holiday", "VALIDATION_ERROR"));
    return;
  }
  if (parsed.data.startDate > parsed.data.endDate) {
    res
      .status(400)
      .json(errorResponse("Start date must not be after end date", "INVALID_DATE_RANGE"));
    return;
  }

  const inserted = await db
    .insert(erpOfficialHolidays)
    .values({
      schoolId,
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    })
    .returning();
  const holiday = inserted[0];
  if (!holiday) {
    res.status(500).json(errorResponse("Failed to create holiday", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ holiday }));
});

erpHrmRouter.delete(
  "/holidays/:id",
  requireSession,
  erpGuard("TIME_OFF_APPROVE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const holidayId = parseIdParam(req.params.id);
    if (!holidayId) {
      res.status(400).json(errorResponse("Invalid holiday ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpOfficialHolidays)
      .where(and(eq(erpOfficialHolidays.id, holidayId), eq(erpOfficialHolidays.schoolId, schoolId)))
      .returning({ id: erpOfficialHolidays.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Holiday not found", "HOLIDAY_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

const payrollRunBodySchema = z.object({
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  notes: z.string().max(2000).nullable().optional(),
});

erpHrmRouter.get("/payroll/runs", requireSession, erpGuard("PAYROLL_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const runs = await db
    .select()
    .from(erpPayrollRuns)
    .where(eq(erpPayrollRuns.schoolId, schoolId))
    .orderBy(desc(erpPayrollRuns.periodStart), desc(erpPayrollRuns.id));

  const stats = await db
    .select({
      payrollRunId: erpPayslips.payrollRunId,
      payslipCount: count(),
      totalNetPay: sum(erpPayslips.netPay),
    })
    .from(erpPayslips)
    .where(eq(erpPayslips.schoolId, schoolId))
    .groupBy(erpPayslips.payrollRunId);

  const statsByRun = new Map(stats.map((row) => [row.payrollRunId, row]));

  const items = runs.map((run) => {
    const stat = statsByRun.get(run.id);
    return {
      ...run,
      payslipCount: Number(stat?.payslipCount ?? 0),
      totalNetPay: Number(stat?.totalNetPay ?? 0),
    };
  });

  res.status(200).json(successResponse({ runs: items }));
});

erpHrmRouter.post("/payroll/runs", requireSession, erpGuard("PAYROLL_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = payrollRunBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid payroll run", "VALIDATION_ERROR"));
    return;
  }
  const { periodStart, periodEnd, notes } = parsed.data;
  if (periodStart > periodEnd) {
    res
      .status(400)
      .json(errorResponse("Period start must not be after period end", "INVALID_DATE_RANGE"));
    return;
  }

  const existing = await db
    .select({ id: erpPayrollRuns.id })
    .from(erpPayrollRuns)
    .where(
      and(
        eq(erpPayrollRuns.schoolId, schoolId),
        eq(erpPayrollRuns.periodStart, periodStart),
        eq(erpPayrollRuns.periodEnd, periodEnd)
      )
    )
    .limit(1);
  if (existing[0]) {
    res
      .status(409)
      .json(errorResponse("Payroll run for this period already exists", "PAYROLL_RUN_EXISTS"));
    return;
  }

  const result = await db.transaction(async (tx) => {
    const insertedRun = await tx
      .insert(erpPayrollRuns)
      .values({ schoolId, periodStart, periodEnd, status: "draft", notes: notes ?? null })
      .returning();
    const run = insertedRun[0]!;

    const structureRows = await tx
      .select({
        id: erpSalaryStructures.id,
        employeeId: erpSalaryStructures.employeeId,
        basicSalary: erpSalaryStructures.basicSalary,
        components: erpSalaryStructures.components,
        effectiveFrom: erpSalaryStructures.effectiveFrom,
      })
      .from(erpSalaryStructures)
      .innerJoin(
        erpEmployees,
        and(
          eq(erpEmployees.id, erpSalaryStructures.employeeId),
          eq(erpEmployees.schoolId, schoolId),
          eq(erpEmployees.isActive, true)
        )
      )
      .where(
        and(eq(erpSalaryStructures.schoolId, schoolId), eq(erpSalaryStructures.isActive, true))
      );

    const latestByEmployee = new Map<
      number,
      { id: number; basicSalary: string; components: Record<string, number>; effectiveFrom: string }
    >();
    for (const row of structureRows) {
      const current = latestByEmployee.get(row.employeeId);
      if (
        !current ||
        row.effectiveFrom > current.effectiveFrom ||
        (row.effectiveFrom === current.effectiveFrom && row.id > current.id)
      ) {
        latestByEmployee.set(row.employeeId, row);
      }
    }

    const payslipValues = [...latestByEmployee.entries()].map(([employeeId, structure]) => {
      const basic = Number(structure.basicSalary);
      let allowances = 0;
      let deductions = 0;
      for (const [key, value] of Object.entries(structure.components ?? {})) {
        const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
        if (key.startsWith("deduction:")) {
          deductions += amount;
        } else {
          allowances += amount;
        }
      }
      const netPay = basic + allowances - deductions;
      return {
        schoolId,
        payrollRunId: run.id,
        employeeId,
        basicSalary: money(basic),
        allowances: money(allowances),
        deductions: money(deductions),
        netPay: money(netPay),
        breakdown: structure.components ?? {},
      };
    });

    if (payslipValues.length > 0) {
      await tx.insert(erpPayslips).values(payslipValues);
    }

    const updatedRun = await tx
      .update(erpPayrollRuns)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(eq(erpPayrollRuns.id, run.id), eq(erpPayrollRuns.schoolId, schoolId)))
      .returning();
    return { run: updatedRun[0] ?? run, payslipCount: payslipValues.length };
  });

  res.status(201).json(
    successResponse({
      run: { ...result.run, payslipCount: result.payslipCount },
    })
  );
});

erpHrmRouter.get(
  "/payroll/runs/:id",
  requireSession,
  erpGuard("PAYROLL_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const runId = parseIdParam(req.params.id);
    if (!runId) {
      res.status(400).json(errorResponse("Invalid payroll run ID", "VALIDATION_ERROR"));
      return;
    }

    const runRows = await db
      .select()
      .from(erpPayrollRuns)
      .where(and(eq(erpPayrollRuns.id, runId), eq(erpPayrollRuns.schoolId, schoolId)))
      .limit(1);
    const run = runRows[0];
    if (!run) {
      res.status(404).json(errorResponse("Payroll run not found", "PAYROLL_RUN_NOT_FOUND"));
      return;
    }

    const payslips = await db
      .select({
        id: erpPayslips.id,
        employeeId: erpPayslips.employeeId,
        employeeName: sql<string>`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
        employeeCode: erpEmployees.employeeCode,
        basicSalary: erpPayslips.basicSalary,
        allowances: erpPayslips.allowances,
        deductions: erpPayslips.deductions,
        netPay: erpPayslips.netPay,
        breakdown: erpPayslips.breakdown,
        createdAt: erpPayslips.createdAt,
      })
      .from(erpPayslips)
      .innerJoin(
        erpEmployees,
        and(eq(erpEmployees.id, erpPayslips.employeeId), eq(erpEmployees.schoolId, schoolId))
      )
      .where(and(eq(erpPayslips.payrollRunId, runId), eq(erpPayslips.schoolId, schoolId)))
      .orderBy(asc(erpEmployees.employeeCode));

    res.status(200).json(successResponse({ run, payslips }));
  }
);

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const expenseBodySchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive().max(99_999_999.99),
  categoryId: z.number().int().positive().nullable().optional(),
  employeeId: z.number().int().positive().nullable().optional(),
  currency: z.string().min(1).max(8).optional(),
  spentAt: z.iso.date(),
  notes: z.string().max(2000).nullable().optional(),
});

const expenseStatusBodySchema = z.object({
  status: z.enum(EXPENSE_STATUSES),
});

const expenseCategoryBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
});

erpHrmRouter.get("/expenses", requireSession, erpGuard("EXPENSES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePageQuery(erpReq);

  const filters = [eq(erpExpenses.schoolId, schoolId)];

  const status = firstQueryValue(erpReq.query.status);
  if (status !== null) {
    if (!(EXPENSE_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json(errorResponse("Invalid status", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpExpenses.status, status));
  }

  const categoryIdRaw = firstQueryValue(erpReq.query.categoryId);
  if (categoryIdRaw) {
    const categoryId = parseIdQuery(erpReq.query.categoryId);
    if (!categoryId) {
      res.status(400).json(errorResponse("Invalid category ID", "VALIDATION_ERROR"));
      return;
    }
    filters.push(eq(erpExpenses.categoryId, categoryId));
  }

  const where = and(...filters);

  const rows = await db
    .select({
      id: erpExpenses.id,
      categoryId: erpExpenses.categoryId,
      categoryName: erpExpenseCategories.name,
      employeeId: erpExpenses.employeeId,
      employeeName: sql<
        string | null
      >`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
      title: erpExpenses.title,
      amount: erpExpenses.amount,
      currency: erpExpenses.currency,
      spentAt: erpExpenses.spentAt,
      status: erpExpenses.status,
      notes: erpExpenses.notes,
      createdBy: erpExpenses.createdBy,
      createdAt: erpExpenses.createdAt,
    })
    .from(erpExpenses)
    .leftJoin(
      erpExpenseCategories,
      and(
        eq(erpExpenseCategories.id, erpExpenses.categoryId),
        eq(erpExpenseCategories.schoolId, schoolId)
      )
    )
    .leftJoin(
      erpEmployees,
      and(eq(erpEmployees.id, erpExpenses.employeeId), eq(erpEmployees.schoolId, schoolId))
    )
    .where(where)
    .orderBy(desc(erpExpenses.spentAt), desc(erpExpenses.id))
    .limit(pageSize)
    .offset(offset);

  const totalRows = await db.select({ value: count() }).from(erpExpenses).where(where);
  const total = Number(totalRows[0]?.value ?? 0);

  res.status(200).json(successResponse({ items: rows, total, page, pageSize }));
});

erpHrmRouter.post("/expenses", requireSession, erpGuard("EXPENSES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = expenseBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid expense", "VALIDATION_ERROR"));
    return;
  }
  const body = parsed.data;

  if (body.categoryId !== undefined && body.categoryId !== null) {
    const category = await db
      .select({ id: erpExpenseCategories.id })
      .from(erpExpenseCategories)
      .where(
        and(
          eq(erpExpenseCategories.id, body.categoryId),
          eq(erpExpenseCategories.schoolId, schoolId)
        )
      )
      .limit(1);
    if (!category[0]) {
      res
        .status(400)
        .json(errorResponse("Expense category not found", "EXPENSE_CATEGORY_NOT_FOUND"));
      return;
    }
  }

  if (body.employeeId !== undefined && body.employeeId !== null) {
    if (!(await employeeExistsInSchool(schoolId, body.employeeId))) {
      res.status(400).json(errorResponse("Employee not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
  }

  const inserted = await db
    .insert(erpExpenses)
    .values({
      schoolId,
      categoryId: body.categoryId ?? null,
      employeeId: body.employeeId ?? null,
      title: body.title,
      amount: money(body.amount),
      currency: body.currency ?? "PKR",
      spentAt: body.spentAt,
      status: "submitted",
      notes: body.notes ?? null,
      createdBy: erpReq.session.user.id,
    })
    .returning();
  const expense = inserted[0];
  if (!expense) {
    res.status(500).json(errorResponse("Failed to create expense", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ expense }));
});

erpHrmRouter.put(
  "/expenses/:id/status",
  requireSession,
  erpGuard("EXPENSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const expenseId = parseIdParam(req.params.id);
    if (!expenseId) {
      res.status(400).json(errorResponse("Invalid expense ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = expenseStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid expense status", "VALIDATION_ERROR"));
      return;
    }

    const updated = await db
      .update(erpExpenses)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(erpExpenses.id, expenseId), eq(erpExpenses.schoolId, schoolId)))
      .returning();
    const expense = updated[0];
    if (!expense) {
      res.status(404).json(errorResponse("Expense not found", "EXPENSE_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ expense }));
  }
);

erpHrmRouter.get(
  "/expense-categories",
  requireSession,
  erpGuard("EXPENSES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const rows = await db
      .select()
      .from(erpExpenseCategories)
      .where(eq(erpExpenseCategories.schoolId, schoolId))
      .orderBy(asc(erpExpenseCategories.name));

    res.status(200).json(successResponse({ categories: rows }));
  }
);

erpHrmRouter.post(
  "/expense-categories",
  requireSession,
  erpGuard("EXPENSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = expenseCategoryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid expense category", "VALIDATION_ERROR"));
      return;
    }

    const existing = await db
      .select({ id: erpExpenseCategories.id })
      .from(erpExpenseCategories)
      .where(
        and(
          eq(erpExpenseCategories.schoolId, schoolId),
          eq(erpExpenseCategories.name, parsed.data.name)
        )
      )
      .limit(1);
    if (existing[0]) {
      res
        .status(409)
        .json(errorResponse("Expense category already exists", "EXPENSE_CATEGORY_EXISTS"));
      return;
    }

    const inserted = await db
      .insert(erpExpenseCategories)
      .values({
        schoolId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .returning();
    const category = inserted[0];
    if (!category) {
      res.status(500).json(errorResponse("Failed to create expense category", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ category }));
  }
);

erpHrmRouter.delete(
  "/expense-categories/:id",
  requireSession,
  erpGuard("EXPENSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const categoryId = parseIdParam(req.params.id);
    if (!categoryId) {
      res.status(400).json(errorResponse("Invalid category ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpExpenseCategories)
      .where(
        and(eq(erpExpenseCategories.id, categoryId), eq(erpExpenseCategories.schoolId, schoolId))
      )
      .returning({ id: erpExpenseCategories.id });
    if (deleted.length === 0) {
      res
        .status(404)
        .json(errorResponse("Expense category not found", "EXPENSE_CATEGORY_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ============================================================================
// Function Calling Dispatcher
// ============================================================================

const dispatch = createDispatcher(hrmFunctions as any, hrmSpec as any) as (
  intent: string,
  args: Record<string, any>,
  context: DispatcherContext
) => Promise<{ function: string; args: Record<string, any>; result: any }>;

const dispatchBodySchema = z.object({
  intent: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
});

erpHrmRouter.post("/dispatch", requireSession, erpGuard("EMPLOYEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const userId = erpReq.session.user.id;

  const parsed = dispatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json(errorResponse("Invalid dispatch request", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const { intent, args = {} } = parsed.data;

  const context: DispatcherContext = {
    schoolId,
    userId,
    permissions: erpReq.erpAccess?.permissions ?? new Set(),
  };

  try {
    const result = await dispatch(intent, args, context);
    res.status(200).json(successResponse(result));
  } catch (error) {
    const { statusCode, body } = dispatchErrorToResponse(error);
    res.status(statusCode).json(body);
  }
});
