/**
 * Attendance Functions
 */

import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { erpEmployees, erpAttendanceRecords } from "../../../db/schema/erp/hrm.js";
import {
  registerHrmFunction,
  type HrmFunctionContext,
  type PaginationParams,
  type PaginatedResult,
  HrmError,
  normalizePagination,
} from "./types.js";

// ============================================================================
// Constants & Schemas
// ============================================================================

const ATTENDANCE_STATUSES = ["present", "absent", "late", "leave", "half_day"] as const;
const ATTENDANCE_SOURCES = ["manual", "kiosk", "import"] as const;

export const attendanceBodySchema = z.object({
  employeeId: z.number().int().positive(),
  workDate: z.iso.date(),
  status: z.enum(ATTENDANCE_STATUSES),
  checkIn: z.iso.datetime().nullable().optional(),
  checkOut: z.iso.datetime().nullable().optional(),
  source: z.enum(ATTENDANCE_SOURCES).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const attendanceBulkBodySchema = z.object({
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

export type AttendanceInput = z.infer<typeof attendanceBodySchema>;
export type AttendanceBulkInput = z.infer<typeof attendanceBulkBodySchema>;

export interface AttendanceRecord {
  id: number;
  schoolId: number;
  employeeId: number;
  workDate: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  source: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceListParams extends PaginationParams {
  employeeId?: number;
  from?: string;
  to?: string;
}

export interface AttendanceListResult extends PaginatedResult<
  AttendanceRecord & {
    employeeName: string;
    employeeCode: string;
  }
> {}

// ============================================================================
// Helpers
// ============================================================================

async function employeeExistsInSchool(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

function isValidIsoDate(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// ============================================================================
// Functions
// ============================================================================

async function listAttendance(
  context: HrmFunctionContext,
  params: AttendanceListParams
): Promise<AttendanceListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const filters = [eq(erpAttendanceRecords.schoolId, context.schoolId)];

  if (params.employeeId !== undefined) {
    filters.push(eq(erpAttendanceRecords.employeeId, params.employeeId));
  }

  if (params.from !== undefined) {
    if (!isValidIsoDate(params.from)) {
      throw HrmError.validation("Invalid from date");
    }
    filters.push(gte(erpAttendanceRecords.workDate, params.from));
  }

  if (params.to !== undefined) {
    if (!isValidIsoDate(params.to)) {
      throw HrmError.validation("Invalid to date");
    }
    filters.push(lte(erpAttendanceRecords.workDate, params.to));
  }

  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
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
        and(
          eq(erpEmployees.id, erpAttendanceRecords.employeeId),
          eq(erpEmployees.schoolId, context.schoolId)
        )
      )
      .where(where)
      .orderBy(desc(erpAttendanceRecords.workDate), desc(erpAttendanceRecords.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(erpAttendanceRecords).where(where),
  ]);

  return {
    items: rows as AttendanceListResult["items"],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function upsertAttendance(
  context: HrmFunctionContext,
  input: AttendanceInput
): Promise<AttendanceRecord> {
  const parsed = attendanceBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid attendance record", parsed.error.flatten());
  }
  const body = parsed.data;

  if (!(await employeeExistsInSchool(context.schoolId, body.employeeId))) {
    throw HrmError.notFound("Employee", body.employeeId);
  }

  const upserted = await db
    .insert(erpAttendanceRecords)
    .values({
      schoolId: context.schoolId,
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
    throw HrmError.internal("Failed to save attendance record");
  }

  return record as AttendanceRecord;
}

async function bulkUpsertAttendance(
  context: HrmFunctionContext,
  input: AttendanceBulkInput
): Promise<{ upserted: number }> {
  const parsed = attendanceBulkBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid bulk attendance", parsed.error.flatten());
  }
  const { date, entries } = parsed.data;

  const employeeIds = [...new Set(entries.map((entry) => entry.employeeId))];
  const validEmployees = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.schoolId, context.schoolId), inArray(erpEmployees.id, employeeIds)));
  if (validEmployees.length !== employeeIds.length) {
    throw HrmError.notFound("Employee", "Some employees do not exist in this school");
  }

  await db
    .insert(erpAttendanceRecords)
    .values(
      entries.map((entry) => ({
        schoolId: context.schoolId,
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

  return { upserted: entries.length };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listAttendance",
  listAttendance,
  "ATTENDANCE_VIEW",
  "List staff attendance records with filters"
);

registerHrmFunction(
  "upsertAttendance",
  upsertAttendance,
  "ATTENDANCE_MANAGE",
  "Create or update a single attendance record"
);

registerHrmFunction(
  "bulkUpsertAttendance",
  bulkUpsertAttendance,
  "ATTENDANCE_MANAGE",
  "Bulk create or update attendance records for a date"
);
