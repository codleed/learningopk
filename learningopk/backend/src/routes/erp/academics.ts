import { and, desc, eq, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import { erpEmployees } from "../../lib/db/schema/erp/hrm.js";
import {
  erpAcademicYears,
  erpClassSubjects,
  erpEnrollments,
  erpExams,
  erpGrades,
  erpSchoolClasses,
  erpStudentAttendance,
  erpTerms,
  erpTimetableSlots,
} from "../../lib/db/schema/erp/academics.js";
import { ERP_WEEKDAYS } from "@learningopk/shared";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { erpGuard, requireErpAccess, type ErpRequest } from "../../lib/erp/acl.js";
import { hasPermission } from "../../lib/erp/permissions.js";

export const erpAcademicsRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const attendanceStatuses = ["present", "absent", "late", "leave", "half_day"] as const;

const paginationFields = {
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
};

const teacherNameSql = sql<
  string | null
>`nullif(concat_ws(' ', ${erpEmployees.firstName}, ${erpEmployees.lastName}), '')`;

const weekdayOrderSql = sql`case ${erpTimetableSlots.weekday} when 'monday' then 1 when 'tuesday' then 2 when 'wednesday' then 3 when 'thursday' then 4 when 'friday' then 5 when 'saturday' then 6 when 'sunday' then 7 else 8 end`;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIdParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function findSchoolClass(
  schoolId: number,
  classId: number
): Promise<{ id: number; name: string } | null> {
  const rows = await db
    .select({ id: erpSchoolClasses.id, name: erpSchoolClasses.name })
    .from(erpSchoolClasses)
    .where(and(eq(erpSchoolClasses.id, classId), eq(erpSchoolClasses.schoolId, schoolId)))
    .limit(1);
  return rows[0] ?? null;
}

async function findEmployee(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

async function selectTimetableSlots(schoolId: number, classId: number | null) {
  const conditions: SQL[] = [eq(erpTimetableSlots.schoolId, schoolId)];
  if (classId !== null) conditions.push(eq(erpTimetableSlots.classId, classId));
  return db
    .select({
      id: erpTimetableSlots.id,
      classId: erpTimetableSlots.classId,
      className: erpSchoolClasses.name,
      classSubjectId: erpTimetableSlots.classSubjectId,
      subjectName: erpClassSubjects.name,
      teacherId: erpClassSubjects.teacherId,
      teacherName: teacherNameSql,
      weekday: erpTimetableSlots.weekday,
      periodNumber: erpTimetableSlots.periodNumber,
      startTime: erpTimetableSlots.startTime,
      endTime: erpTimetableSlots.endTime,
      room: erpTimetableSlots.room,
    })
    .from(erpTimetableSlots)
    .innerJoin(erpClassSubjects, eq(erpClassSubjects.id, erpTimetableSlots.classSubjectId))
    .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpTimetableSlots.classId))
    .leftJoin(erpEmployees, eq(erpEmployees.id, erpClassSubjects.teacherId))
    .where(and(...conditions))
    .orderBy(weekdayOrderSql, erpTimetableSlots.periodNumber);
}

async function selectStudentGrades(schoolId: number, studentUserId: string) {
  return db
    .select({
      id: erpGrades.id,
      examId: erpExams.id,
      examName: erpExams.name,
      examDate: erpExams.examDate,
      totalMarks: erpExams.totalMarks,
      subjectName: erpClassSubjects.name,
      className: erpSchoolClasses.name,
      marksObtained: erpGrades.marksObtained,
      remarks: erpGrades.remarks,
      gradedAt: erpGrades.gradedAt,
    })
    .from(erpGrades)
    .innerJoin(erpExams, eq(erpExams.id, erpGrades.examId))
    .innerJoin(erpClassSubjects, eq(erpClassSubjects.id, erpExams.classSubjectId))
    .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpClassSubjects.classId))
    .where(and(eq(erpGrades.schoolId, schoolId), eq(erpGrades.studentUserId, studentUserId)))
    .orderBy(desc(erpExams.examDate), desc(erpExams.id));
}

async function validateStudentUsers(
  studentIds: string[]
): Promise<{ ok: true } | { ok: false; invalid: string[] }> {
  if (studentIds.length === 0) return { ok: true };
  const rows = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(inArray(users.id, studentIds));
  const valid = new Set(rows.filter((r) => r.role === "student").map((r) => r.id));
  const invalid = studentIds.filter((id) => !valid.has(id));
  return invalid.length > 0 ? { ok: false, invalid } : { ok: true };
}

// ---------------------------------------------------------------------------
// Academic years & terms
// ---------------------------------------------------------------------------

const yearsQuerySchema = z.object({ ...paginationFields });

erpAcademicsRouter.get("/years", requireSession, erpGuard("CLASSES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = yearsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid years query", "VALIDATION_ERROR"));
    return;
  }
  const { page, pageSize } = parsed.data;
  const whereClause = eq(erpAcademicYears.schoolId, schoolId);
  const items = await db
    .select()
    .from(erpAcademicYears)
    .where(whereClause)
    .orderBy(desc(erpAcademicYears.startDate), desc(erpAcademicYears.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);
  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(erpAcademicYears)
    .where(whereClause);
  res.status(200).json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
});

const yearBodySchema = z.object({
  name: z.string().min(1).max(80),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex),
  isCurrent: z.boolean().optional(),
});

erpAcademicsRouter.post("/years", requireSession, erpGuard("CLASSES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = yearBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid academic year", "VALIDATION_ERROR"));
    return;
  }
  const { name, startDate, endDate, isCurrent } = parsed.data;
  const existing = await db
    .select({ id: erpAcademicYears.id })
    .from(erpAcademicYears)
    .where(and(eq(erpAcademicYears.schoolId, schoolId), eq(erpAcademicYears.name, name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Academic year already exists", "YEAR_EXISTS"));
    return;
  }
  const year = await db.transaction(async (tx) => {
    if (isCurrent === true) {
      await tx
        .update(erpAcademicYears)
        .set({ isCurrent: false })
        .where(and(eq(erpAcademicYears.schoolId, schoolId), eq(erpAcademicYears.isCurrent, true)));
    }
    const rows = await tx
      .insert(erpAcademicYears)
      .values({ schoolId, name, startDate, endDate, isCurrent: isCurrent ?? false })
      .returning();
    return rows[0] ?? null;
  });
  if (!year) {
    res.status(500).json(errorResponse("Failed to create academic year", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ year }));
});

const yearUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  isCurrent: z.boolean().optional(),
});

erpAcademicsRouter.put(
  "/years/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const yearId = parseIdParam(req.params.id);
    if (yearId === null) {
      res.status(400).json(errorResponse("Invalid year ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = yearUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid academic year update", "VALIDATION_ERROR"));
      return;
    }
    const existingRows = await db
      .select()
      .from(erpAcademicYears)
      .where(and(eq(erpAcademicYears.id, yearId), eq(erpAcademicYears.schoolId, schoolId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      res.status(404).json(errorResponse("Academic year not found", "YEAR_NOT_FOUND"));
      return;
    }
    const { name, startDate, endDate, isCurrent } = parsed.data;
    if (name !== undefined && name !== existing.name) {
      const conflict = await db
        .select({ id: erpAcademicYears.id })
        .from(erpAcademicYears)
        .where(and(eq(erpAcademicYears.schoolId, schoolId), eq(erpAcademicYears.name, name)))
        .limit(1);
      if (conflict[0]) {
        res.status(409).json(errorResponse("Academic year already exists", "YEAR_EXISTS"));
        return;
      }
    }
    const year = await db.transaction(async (tx) => {
      if (isCurrent === true) {
        await tx
          .update(erpAcademicYears)
          .set({ isCurrent: false })
          .where(
            and(
              eq(erpAcademicYears.schoolId, schoolId),
              eq(erpAcademicYears.isCurrent, true),
              ne(erpAcademicYears.id, yearId)
            )
          );
      }
      const rows = await tx
        .update(erpAcademicYears)
        .set({
          ...(name !== undefined ? { name } : {}),
          ...(startDate !== undefined ? { startDate } : {}),
          ...(endDate !== undefined ? { endDate } : {}),
          ...(isCurrent !== undefined ? { isCurrent } : {}),
        })
        .where(and(eq(erpAcademicYears.id, yearId), eq(erpAcademicYears.schoolId, schoolId)))
        .returning();
      return rows[0] ?? null;
    });
    if (!year) {
      res.status(404).json(errorResponse("Academic year not found", "YEAR_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ year }));
  }
);

erpAcademicsRouter.delete(
  "/years/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const yearId = parseIdParam(req.params.id);
    if (yearId === null) {
      res.status(400).json(errorResponse("Invalid year ID", "VALIDATION_ERROR"));
      return;
    }
    const deleted = await db
      .delete(erpAcademicYears)
      .where(and(eq(erpAcademicYears.id, yearId), eq(erpAcademicYears.schoolId, schoolId)))
      .returning({ id: erpAcademicYears.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Academic year not found", "YEAR_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

const termsQuerySchema = z.object({
  ...paginationFields,
  yearId: z.coerce.number().int().positive().optional(),
});

erpAcademicsRouter.get("/terms", requireSession, erpGuard("CLASSES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = termsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid terms query", "VALIDATION_ERROR"));
    return;
  }
  const { page, pageSize, yearId } = parsed.data;
  const conditions: SQL[] = [eq(erpTerms.schoolId, schoolId)];
  if (yearId !== undefined) conditions.push(eq(erpTerms.academicYearId, yearId));
  const whereClause = and(...conditions);
  const items = await db
    .select()
    .from(erpTerms)
    .where(whereClause)
    .orderBy(desc(erpTerms.startDate), desc(erpTerms.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);
  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(erpTerms)
    .where(whereClause);
  res.status(200).json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
});

const termBodySchema = z.object({
  academicYearId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex),
  isCurrent: z.boolean().optional(),
});

erpAcademicsRouter.post("/terms", requireSession, erpGuard("CLASSES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = termBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid term", "VALIDATION_ERROR"));
    return;
  }
  const { academicYearId, name, startDate, endDate, isCurrent } = parsed.data;
  const yearRows = await db
    .select({ id: erpAcademicYears.id })
    .from(erpAcademicYears)
    .where(and(eq(erpAcademicYears.id, academicYearId), eq(erpAcademicYears.schoolId, schoolId)))
    .limit(1);
  if (!yearRows[0]) {
    res.status(400).json(errorResponse("Academic year not found", "YEAR_NOT_FOUND"));
    return;
  }
  const existing = await db
    .select({ id: erpTerms.id })
    .from(erpTerms)
    .where(and(eq(erpTerms.academicYearId, academicYearId), eq(erpTerms.name, name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Term already exists", "TERM_EXISTS"));
    return;
  }
  const term = await db.transaction(async (tx) => {
    if (isCurrent === true) {
      await tx
        .update(erpTerms)
        .set({ isCurrent: false })
        .where(
          and(
            eq(erpTerms.schoolId, schoolId),
            eq(erpTerms.academicYearId, academicYearId),
            eq(erpTerms.isCurrent, true)
          )
        );
    }
    const rows = await tx
      .insert(erpTerms)
      .values({
        schoolId,
        academicYearId,
        name,
        startDate,
        endDate,
        isCurrent: isCurrent ?? false,
      })
      .returning();
    return rows[0] ?? null;
  });
  if (!term) {
    res.status(500).json(errorResponse("Failed to create term", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ term }));
});

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

const classesQuerySchema = z.object({
  ...paginationFields,
  yearId: z.coerce.number().int().positive().optional(),
  gradeLevel: z.string().min(1).max(40).optional(),
});

erpAcademicsRouter.get("/classes", requireSession, erpGuard("CLASSES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = classesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid classes query", "VALIDATION_ERROR"));
    return;
  }
  const { page, pageSize, yearId, gradeLevel } = parsed.data;
  const conditions: SQL[] = [eq(erpSchoolClasses.schoolId, schoolId)];
  if (yearId !== undefined) conditions.push(eq(erpSchoolClasses.academicYearId, yearId));
  if (gradeLevel !== undefined) conditions.push(eq(erpSchoolClasses.gradeLevel, gradeLevel));
  const whereClause = and(...conditions);

  const items = await db
    .select({
      id: erpSchoolClasses.id,
      academicYearId: erpSchoolClasses.academicYearId,
      name: erpSchoolClasses.name,
      gradeLevel: erpSchoolClasses.gradeLevel,
      section: erpSchoolClasses.section,
      capacity: erpSchoolClasses.capacity,
      classTeacherId: erpSchoolClasses.classTeacherId,
      teacherName: teacherNameSql,
      room: erpSchoolClasses.room,
      createdAt: erpSchoolClasses.createdAt,
      updatedAt: erpSchoolClasses.updatedAt,
      enrollmentCount: sql<number>`(select count(*)::int from ${erpEnrollments} where ${erpEnrollments.classId} = ${erpSchoolClasses.id} and ${erpEnrollments.status} = 'active')`,
    })
    .from(erpSchoolClasses)
    .leftJoin(erpEmployees, eq(erpEmployees.id, erpSchoolClasses.classTeacherId))
    .where(whereClause)
    .orderBy(desc(erpSchoolClasses.createdAt), desc(erpSchoolClasses.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(erpSchoolClasses)
    .where(whereClause);

  res.status(200).json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
});

const classBodySchema = z.object({
  academicYearId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  gradeLevel: z.string().min(1).max(40),
  section: z.string().max(40).nullable().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().max(60).nullable().optional(),
  classTeacherId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.post(
  "/classes",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = classBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid class", "VALIDATION_ERROR"));
      return;
    }
    const { academicYearId, name, gradeLevel, section, capacity, room, classTeacherId } =
      parsed.data;

    const yearRows = await db
      .select({ id: erpAcademicYears.id })
      .from(erpAcademicYears)
      .where(and(eq(erpAcademicYears.id, academicYearId), eq(erpAcademicYears.schoolId, schoolId)))
      .limit(1);
    if (!yearRows[0]) {
      res.status(400).json(errorResponse("Academic year not found", "YEAR_NOT_FOUND"));
      return;
    }
    if (classTeacherId != null && !(await findEmployee(schoolId, classTeacherId))) {
      res.status(400).json(errorResponse("Class teacher not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    const existing = await db
      .select({ id: erpSchoolClasses.id })
      .from(erpSchoolClasses)
      .where(
        and(eq(erpSchoolClasses.academicYearId, academicYearId), eq(erpSchoolClasses.name, name))
      )
      .limit(1);
    if (existing[0]) {
      res.status(409).json(errorResponse("Class already exists in this year", "CLASS_EXISTS"));
      return;
    }
    const inserted = await db
      .insert(erpSchoolClasses)
      .values({
        schoolId,
        academicYearId,
        name,
        gradeLevel,
        section: section ?? null,
        ...(capacity !== undefined ? { capacity } : {}),
        room: room ?? null,
        classTeacherId: classTeacherId ?? null,
      })
      .returning();
    const created = inserted[0];
    if (!created) {
      res.status(500).json(errorResponse("Failed to create class", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ class: created }));
  }
);

const classUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  gradeLevel: z.string().min(1).max(40).optional(),
  section: z.string().max(40).nullable().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  room: z.string().max(60).nullable().optional(),
  classTeacherId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.put(
  "/classes/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = classUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid class update", "VALIDATION_ERROR"));
      return;
    }
    const existingRows = await db
      .select()
      .from(erpSchoolClasses)
      .where(and(eq(erpSchoolClasses.id, classId), eq(erpSchoolClasses.schoolId, schoolId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const { name, gradeLevel, section, capacity, room, classTeacherId } = parsed.data;
    if (name !== undefined && name !== existing.name) {
      const conflict = await db
        .select({ id: erpSchoolClasses.id })
        .from(erpSchoolClasses)
        .where(
          and(
            eq(erpSchoolClasses.academicYearId, existing.academicYearId),
            eq(erpSchoolClasses.name, name),
            ne(erpSchoolClasses.id, classId)
          )
        )
        .limit(1);
      if (conflict[0]) {
        res.status(409).json(errorResponse("Class already exists in this year", "CLASS_EXISTS"));
        return;
      }
    }
    if (classTeacherId != null && !(await findEmployee(schoolId, classTeacherId))) {
      res.status(400).json(errorResponse("Class teacher not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    const updatedRows = await db
      .update(erpSchoolClasses)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(gradeLevel !== undefined ? { gradeLevel } : {}),
        ...(section !== undefined ? { section } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(room !== undefined ? { room } : {}),
        ...(classTeacherId !== undefined ? { classTeacherId } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(erpSchoolClasses.id, classId), eq(erpSchoolClasses.schoolId, schoolId)))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ class: updated }));
  }
);

erpAcademicsRouter.delete(
  "/classes/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    const deleted = await db
      .delete(erpSchoolClasses)
      .where(and(eq(erpSchoolClasses.id, classId), eq(erpSchoolClasses.schoolId, schoolId)))
      .returning({ id: erpSchoolClasses.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

const classStudentsQuerySchema = z.object({ ...paginationFields });

erpAcademicsRouter.get(
  "/classes/:id/students",
  requireSession,
  erpGuard("ENROLLMENTS_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = classStudentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid students query", "VALIDATION_ERROR"));
      return;
    }
    const { page, pageSize } = parsed.data;
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const whereClause = and(
      eq(erpEnrollments.schoolId, schoolId),
      eq(erpEnrollments.classId, classId)
    );
    const items = await db
      .select({
        id: erpEnrollments.id,
        studentUserId: erpEnrollments.studentUserId,
        name: users.name,
        email: users.email,
        rollNumber: erpEnrollments.rollNumber,
        status: erpEnrollments.status,
        enrolledAt: erpEnrollments.enrolledAt,
        endedAt: erpEnrollments.endedAt,
      })
      .from(erpEnrollments)
      .innerJoin(users, eq(users.id, erpEnrollments.studentUserId))
      .where(whereClause)
      .orderBy(sql`${erpEnrollments.rollNumber} asc nulls last`, users.name)
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(erpEnrollments)
      .where(whereClause);
    res
      .status(200)
      .json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
  }
);

const enrollBodySchema = z.object({
  studentUserId: z.string().min(1),
  rollNumber: z.string().max(40).nullable().optional(),
});

erpAcademicsRouter.post(
  "/classes/:id/enroll",
  requireSession,
  erpGuard("ENROLLMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = enrollBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid enrollment", "VALIDATION_ERROR"));
      return;
    }
    const { studentUserId, rollNumber } = parsed.data;
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const userRows = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, studentUserId))
      .limit(1);
    const user = userRows[0];
    if (!user) {
      res.status(404).json(errorResponse("User not found", "USER_NOT_FOUND"));
      return;
    }
    if (user.role !== "student") {
      res.status(400).json(errorResponse("User is not a student", "NOT_A_STUDENT"));
      return;
    }
    const inserted = await db
      .insert(erpEnrollments)
      .values({
        schoolId,
        classId,
        studentUserId,
        rollNumber: rollNumber ?? null,
        status: "active",
        enrolledAt: todayString(),
      })
      .onConflictDoNothing()
      .returning();
    const enrollment = inserted[0];
    if (!enrollment) {
      res
        .status(409)
        .json(errorResponse("Student is already enrolled in this class", "ENROLLMENT_EXISTS"));
      return;
    }
    res.status(201).json(successResponse({ enrollment }));
  }
);

erpAcademicsRouter.delete(
  "/enrollments/:id",
  requireSession,
  erpGuard("ENROLLMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const enrollmentId = parseIdParam(req.params.id);
    if (enrollmentId === null) {
      res.status(400).json(errorResponse("Invalid enrollment ID", "VALIDATION_ERROR"));
      return;
    }
    const updatedRows = await db
      .update(erpEnrollments)
      .set({ status: "withdrawn", endedAt: todayString(), updatedAt: new Date() })
      .where(and(eq(erpEnrollments.id, enrollmentId), eq(erpEnrollments.schoolId, schoolId)))
      .returning();
    const enrollment = updatedRows[0];
    if (!enrollment) {
      res.status(404).json(errorResponse("Enrollment not found", "ENROLLMENT_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ enrollment }));
  }
);

// ---------------------------------------------------------------------------
// Class subjects
// ---------------------------------------------------------------------------

erpAcademicsRouter.get(
  "/classes/:id/subjects",
  requireSession,
  erpGuard("CLASSES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const subjects = await db
      .select({
        id: erpClassSubjects.id,
        classId: erpClassSubjects.classId,
        name: erpClassSubjects.name,
        subjectCode: erpClassSubjects.subjectCode,
        teacherId: erpClassSubjects.teacherId,
        teacherName: teacherNameSql,
        createdAt: erpClassSubjects.createdAt,
      })
      .from(erpClassSubjects)
      .leftJoin(erpEmployees, eq(erpEmployees.id, erpClassSubjects.teacherId))
      .where(and(eq(erpClassSubjects.schoolId, schoolId), eq(erpClassSubjects.classId, classId)))
      .orderBy(erpClassSubjects.name);
    res.status(200).json(successResponse({ subjects }));
  }
);

const subjectBodySchema = z.object({
  name: z.string().min(1).max(80),
  subjectCode: z.string().max(40).nullable().optional(),
  teacherId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.post(
  "/classes/:id/subjects",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const classId = parseIdParam(req.params.id);
    if (classId === null) {
      res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = subjectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid subject", "VALIDATION_ERROR"));
      return;
    }
    const { name, subjectCode, teacherId } = parsed.data;
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    if (teacherId != null && !(await findEmployee(schoolId, teacherId))) {
      res.status(400).json(errorResponse("Teacher not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    const existing = await db
      .select({ id: erpClassSubjects.id })
      .from(erpClassSubjects)
      .where(and(eq(erpClassSubjects.classId, classId), eq(erpClassSubjects.name, name)))
      .limit(1);
    if (existing[0]) {
      res.status(409).json(errorResponse("Subject already exists in this class", "SUBJECT_EXISTS"));
      return;
    }
    const inserted = await db
      .insert(erpClassSubjects)
      .values({
        schoolId,
        classId,
        name,
        subjectCode: subjectCode ?? null,
        teacherId: teacherId ?? null,
      })
      .returning();
    const created = inserted[0];
    if (!created) {
      res.status(500).json(errorResponse("Failed to create subject", "INTERNAL_ERROR"));
      return;
    }
    res.status(201).json(successResponse({ subject: created }));
  }
);

const subjectUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  subjectCode: z.string().max(40).nullable().optional(),
  teacherId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.put(
  "/subjects/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const subjectId = parseIdParam(req.params.id);
    if (subjectId === null) {
      res.status(400).json(errorResponse("Invalid subject ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = subjectUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid subject update", "VALIDATION_ERROR"));
      return;
    }
    const existingRows = await db
      .select()
      .from(erpClassSubjects)
      .where(and(eq(erpClassSubjects.id, subjectId), eq(erpClassSubjects.schoolId, schoolId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      res.status(404).json(errorResponse("Subject not found", "SUBJECT_NOT_FOUND"));
      return;
    }
    const { name, subjectCode, teacherId } = parsed.data;
    if (name !== undefined && name !== existing.name) {
      const conflict = await db
        .select({ id: erpClassSubjects.id })
        .from(erpClassSubjects)
        .where(
          and(
            eq(erpClassSubjects.classId, existing.classId),
            eq(erpClassSubjects.name, name),
            ne(erpClassSubjects.id, subjectId)
          )
        )
        .limit(1);
      if (conflict[0]) {
        res
          .status(409)
          .json(errorResponse("Subject already exists in this class", "SUBJECT_EXISTS"));
        return;
      }
    }
    if (teacherId != null && !(await findEmployee(schoolId, teacherId))) {
      res.status(400).json(errorResponse("Teacher not found", "EMPLOYEE_NOT_FOUND"));
      return;
    }
    const updatedRows = await db
      .update(erpClassSubjects)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(subjectCode !== undefined ? { subjectCode } : {}),
        ...(teacherId !== undefined ? { teacherId } : {}),
      })
      .where(and(eq(erpClassSubjects.id, subjectId), eq(erpClassSubjects.schoolId, schoolId)))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      res.status(404).json(errorResponse("Subject not found", "SUBJECT_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ subject: updated }));
  }
);

erpAcademicsRouter.delete(
  "/subjects/:id",
  requireSession,
  erpGuard("CLASSES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const subjectId = parseIdParam(req.params.id);
    if (subjectId === null) {
      res.status(400).json(errorResponse("Invalid subject ID", "VALIDATION_ERROR"));
      return;
    }
    const deleted = await db
      .delete(erpClassSubjects)
      .where(and(eq(erpClassSubjects.id, subjectId), eq(erpClassSubjects.schoolId, schoolId)))
      .returning({ id: erpClassSubjects.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Subject not found", "SUBJECT_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------

const timetableQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
});

erpAcademicsRouter.get(
  "/timetable",
  requireSession,
  erpGuard("TIMETABLE_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = timetableQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid timetable query", "VALIDATION_ERROR"));
      return;
    }
    const slots = await selectTimetableSlots(schoolId, parsed.data.classId ?? null);
    res.status(200).json(successResponse({ slots }));
  }
);

const timetableBodySchema = z.object({
  classId: z.number().int().positive(),
  classSubjectId: z.number().int().positive(),
  weekday: z.enum(ERP_WEEKDAYS),
  periodNumber: z.number().int().min(1).max(30),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  room: z.string().max(60).nullable().optional(),
});

erpAcademicsRouter.post(
  "/timetable",
  requireSession,
  erpGuard("TIMETABLE_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = timetableBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid timetable slot", "VALIDATION_ERROR"));
      return;
    }
    const { classId, classSubjectId, weekday, periodNumber, startTime, endTime, room } =
      parsed.data;
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const subjectRows = await db
      .select({ id: erpClassSubjects.id })
      .from(erpClassSubjects)
      .where(
        and(
          eq(erpClassSubjects.id, classSubjectId),
          eq(erpClassSubjects.classId, classId),
          eq(erpClassSubjects.schoolId, schoolId)
        )
      )
      .limit(1);
    if (!subjectRows[0]) {
      res
        .status(400)
        .json(errorResponse("Subject does not belong to this class", "SUBJECT_NOT_IN_CLASS"));
      return;
    }
    const rows = await db
      .insert(erpTimetableSlots)
      .values({
        schoolId,
        classId,
        classSubjectId,
        weekday,
        periodNumber,
        startTime,
        endTime,
        room: room ?? null,
      })
      .onConflictDoUpdate({
        target: [
          erpTimetableSlots.classId,
          erpTimetableSlots.weekday,
          erpTimetableSlots.periodNumber,
        ],
        set: {
          classSubjectId,
          startTime,
          endTime,
          room: room ?? null,
        },
      })
      .returning();
    const slot = rows[0];
    if (!slot) {
      res.status(500).json(errorResponse("Failed to save timetable slot", "INTERNAL_ERROR"));
      return;
    }
    res.status(200).json(successResponse({ slot }));
  }
);

erpAcademicsRouter.delete(
  "/timetable/:id",
  requireSession,
  erpGuard("TIMETABLE_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const slotId = parseIdParam(req.params.id);
    if (slotId === null) {
      res.status(400).json(errorResponse("Invalid timetable slot ID", "VALIDATION_ERROR"));
      return;
    }
    const deleted = await db
      .delete(erpTimetableSlots)
      .where(and(eq(erpTimetableSlots.id, slotId), eq(erpTimetableSlots.schoolId, schoolId)))
      .returning({ id: erpTimetableSlots.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Timetable slot not found", "SLOT_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Exams & gradebook
// ---------------------------------------------------------------------------

const examsQuerySchema = z.object({
  ...paginationFields,
  classSubjectId: z.coerce.number().int().positive().optional(),
  termId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
});

erpAcademicsRouter.get("/exams", requireSession, erpGuard("EXAMS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = examsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid exams query", "VALIDATION_ERROR"));
    return;
  }
  const { page, pageSize, classSubjectId, termId, classId } = parsed.data;
  const conditions: SQL[] = [eq(erpExams.schoolId, schoolId)];
  if (classSubjectId !== undefined) conditions.push(eq(erpExams.classSubjectId, classSubjectId));
  if (termId !== undefined) conditions.push(eq(erpExams.termId, termId));
  if (classId !== undefined) conditions.push(eq(erpClassSubjects.classId, classId));
  const whereClause = and(...conditions);

  const items = await db
    .select({
      id: erpExams.id,
      termId: erpExams.termId,
      classSubjectId: erpExams.classSubjectId,
      subjectName: erpClassSubjects.name,
      classId: erpClassSubjects.classId,
      className: erpSchoolClasses.name,
      name: erpExams.name,
      examDate: erpExams.examDate,
      totalMarks: erpExams.totalMarks,
      weight: erpExams.weight,
      createdAt: erpExams.createdAt,
    })
    .from(erpExams)
    .innerJoin(erpClassSubjects, eq(erpClassSubjects.id, erpExams.classSubjectId))
    .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpClassSubjects.classId))
    .where(whereClause)
    .orderBy(desc(erpExams.examDate), desc(erpExams.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(erpExams)
    .innerJoin(erpClassSubjects, eq(erpClassSubjects.id, erpExams.classSubjectId))
    .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpClassSubjects.classId))
    .where(whereClause);

  res.status(200).json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
});

const examBodySchema = z.object({
  classSubjectId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  examDate: z.string().regex(dateRegex),
  totalMarks: z.number().int().min(1).max(1000).optional(),
  weight: z.number().min(0).max(999).optional(),
  termId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.post("/exams", requireSession, erpGuard("EXAMS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const parsed = examBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid exam", "VALIDATION_ERROR"));
    return;
  }
  const { classSubjectId, name, examDate, totalMarks, weight, termId } = parsed.data;
  const subjectRows = await db
    .select({ id: erpClassSubjects.id })
    .from(erpClassSubjects)
    .where(and(eq(erpClassSubjects.id, classSubjectId), eq(erpClassSubjects.schoolId, schoolId)))
    .limit(1);
  if (!subjectRows[0]) {
    res.status(400).json(errorResponse("Subject not found", "SUBJECT_NOT_FOUND"));
    return;
  }
  if (termId != null) {
    const termRows = await db
      .select({ id: erpTerms.id })
      .from(erpTerms)
      .where(and(eq(erpTerms.id, termId), eq(erpTerms.schoolId, schoolId)))
      .limit(1);
    if (!termRows[0]) {
      res.status(400).json(errorResponse("Term not found", "TERM_NOT_FOUND"));
      return;
    }
  }
  const existing = await db
    .select({ id: erpExams.id })
    .from(erpExams)
    .where(and(eq(erpExams.classSubjectId, classSubjectId), eq(erpExams.name, name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Exam already exists for this subject", "EXAM_EXISTS"));
    return;
  }
  const inserted = await db
    .insert(erpExams)
    .values({
      schoolId,
      classSubjectId,
      name,
      examDate,
      ...(totalMarks !== undefined ? { totalMarks } : {}),
      ...(weight !== undefined ? { weight: String(weight) } : {}),
      ...(termId !== undefined ? { termId } : {}),
    })
    .returning();
  const created = inserted[0];
  if (!created) {
    res.status(500).json(errorResponse("Failed to create exam", "INTERNAL_ERROR"));
    return;
  }
  res.status(201).json(successResponse({ exam: created }));
});

const examUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  examDate: z.string().regex(dateRegex).optional(),
  totalMarks: z.number().int().min(1).max(1000).optional(),
  weight: z.number().min(0).max(999).optional(),
  termId: z.number().int().positive().nullable().optional(),
});

erpAcademicsRouter.put("/exams/:id", requireSession, erpGuard("EXAMS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const examId = parseIdParam(req.params.id);
  if (examId === null) {
    res.status(400).json(errorResponse("Invalid exam ID", "VALIDATION_ERROR"));
    return;
  }
  const parsed = examUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid exam update", "VALIDATION_ERROR"));
    return;
  }
  const existingRows = await db
    .select()
    .from(erpExams)
    .where(and(eq(erpExams.id, examId), eq(erpExams.schoolId, schoolId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) {
    res.status(404).json(errorResponse("Exam not found", "EXAM_NOT_FOUND"));
    return;
  }
  const { name, examDate, totalMarks, weight, termId } = parsed.data;
  if (name !== undefined && name !== existing.name) {
    const conflict = await db
      .select({ id: erpExams.id })
      .from(erpExams)
      .where(
        and(
          eq(erpExams.classSubjectId, existing.classSubjectId),
          eq(erpExams.name, name),
          ne(erpExams.id, examId)
        )
      )
      .limit(1);
    if (conflict[0]) {
      res.status(409).json(errorResponse("Exam already exists for this subject", "EXAM_EXISTS"));
      return;
    }
  }
  if (termId != null) {
    const termRows = await db
      .select({ id: erpTerms.id })
      .from(erpTerms)
      .where(and(eq(erpTerms.id, termId), eq(erpTerms.schoolId, schoolId)))
      .limit(1);
    if (!termRows[0]) {
      res.status(400).json(errorResponse("Term not found", "TERM_NOT_FOUND"));
      return;
    }
  }
  const updatedRows = await db
    .update(erpExams)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(examDate !== undefined ? { examDate } : {}),
      ...(totalMarks !== undefined ? { totalMarks } : {}),
      ...(weight !== undefined ? { weight: String(weight) } : {}),
      ...(termId !== undefined ? { termId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(erpExams.id, examId), eq(erpExams.schoolId, schoolId)))
    .returning();
  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json(errorResponse("Exam not found", "EXAM_NOT_FOUND"));
    return;
  }
  res.status(200).json(successResponse({ exam: updated }));
});

erpAcademicsRouter.delete(
  "/exams/:id",
  requireSession,
  erpGuard("EXAMS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const examId = parseIdParam(req.params.id);
    if (examId === null) {
      res.status(400).json(errorResponse("Invalid exam ID", "VALIDATION_ERROR"));
      return;
    }
    const deleted = await db
      .delete(erpExams)
      .where(and(eq(erpExams.id, examId), eq(erpExams.schoolId, schoolId)))
      .returning({ id: erpExams.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Exam not found", "EXAM_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

erpAcademicsRouter.get(
  "/exams/:id/grades",
  requireSession,
  erpGuard("GRADES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const examId = parseIdParam(req.params.id);
    if (examId === null) {
      res.status(400).json(errorResponse("Invalid exam ID", "VALIDATION_ERROR"));
      return;
    }
    const examRows = await db
      .select()
      .from(erpExams)
      .where(and(eq(erpExams.id, examId), eq(erpExams.schoolId, schoolId)))
      .limit(1);
    const exam = examRows[0];
    if (!exam) {
      res.status(404).json(errorResponse("Exam not found", "EXAM_NOT_FOUND"));
      return;
    }
    const grades = await db
      .select({
        id: erpGrades.id,
        studentUserId: erpGrades.studentUserId,
        studentName: users.name,
        marksObtained: erpGrades.marksObtained,
        remarks: erpGrades.remarks,
        gradedBy: erpGrades.gradedBy,
        gradedAt: erpGrades.gradedAt,
      })
      .from(erpGrades)
      .innerJoin(users, eq(users.id, erpGrades.studentUserId))
      .where(and(eq(erpGrades.schoolId, schoolId), eq(erpGrades.examId, examId)))
      .orderBy(users.name);
    res.status(200).json(
      successResponse({
        exam: {
          id: exam.id,
          termId: exam.termId,
          classSubjectId: exam.classSubjectId,
          name: exam.name,
          examDate: exam.examDate,
          totalMarks: exam.totalMarks,
          weight: exam.weight,
        },
        grades,
      })
    );
  }
);

const gradesBodySchema = z.object({
  entries: z
    .array(
      z.object({
        studentUserId: z.string().min(1),
        marksObtained: z.number().min(0).max(10000),
        remarks: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(500),
});

erpAcademicsRouter.post(
  "/exams/:id/grades",
  requireSession,
  erpGuard("GRADES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const userId = erpReq.session.user.id;
    const examId = parseIdParam(req.params.id);
    if (examId === null) {
      res.status(400).json(errorResponse("Invalid exam ID", "VALIDATION_ERROR"));
      return;
    }
    const parsed = gradesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid grade entries", "VALIDATION_ERROR"));
      return;
    }
    const examRows = await db
      .select({ id: erpExams.id })
      .from(erpExams)
      .where(and(eq(erpExams.id, examId), eq(erpExams.schoolId, schoolId)))
      .limit(1);
    if (!examRows[0]) {
      res.status(404).json(errorResponse("Exam not found", "EXAM_NOT_FOUND"));
      return;
    }
    const entryMap = new Map(parsed.data.entries.map((entry) => [entry.studentUserId, entry]));
    const entries = Array.from(entryMap.values());
    const studentIds = Array.from(entryMap.keys());
    const studentCheck = await validateStudentUsers(studentIds);
    if (!studentCheck.ok) {
      res
        .status(400)
        .json(
          errorResponse("Some students were not found or are not students", "STUDENT_NOT_FOUND")
        );
      return;
    }
    const rows = await db
      .insert(erpGrades)
      .values(
        entries.map((entry) => ({
          schoolId,
          examId,
          studentUserId: entry.studentUserId,
          marksObtained: String(entry.marksObtained),
          remarks: entry.remarks ?? null,
          gradedBy: userId,
          gradedAt: new Date(),
        }))
      )
      .onConflictDoUpdate({
        target: [erpGrades.examId, erpGrades.studentUserId],
        set: {
          marksObtained: sql`excluded.marks_obtained`,
          remarks: sql`excluded.remarks`,
          gradedBy: sql`excluded.graded_by`,
          gradedAt: sql`excluded.graded_at`,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.status(200).json(successResponse({ saved: rows.length, grades: rows }));
  }
);

erpAcademicsRouter.get(
  "/grades/student/:studentUserId",
  requireSession,
  erpGuard("GRADES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const studentUserId = req.params.studentUserId;
    if (typeof studentUserId !== "string" || studentUserId === "") {
      res.status(400).json(errorResponse("Invalid student user ID", "VALIDATION_ERROR"));
      return;
    }
    const grades = await selectStudentGrades(schoolId, studentUserId);
    res.status(200).json(successResponse({ grades }));
  }
);

// ---------------------------------------------------------------------------
// Student attendance
// ---------------------------------------------------------------------------

const attendanceQuerySchema = z.object({
  ...paginationFields,
  classId: z.coerce.number().int().positive().optional(),
  date: z.string().regex(dateRegex).optional(),
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
});

erpAcademicsRouter.get(
  "/attendance",
  requireSession,
  erpGuard("ATTENDANCE_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = attendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid attendance query", "VALIDATION_ERROR"));
      return;
    }
    const { page, pageSize, classId, date, from, to } = parsed.data;
    const conditions: SQL[] = [eq(erpStudentAttendance.schoolId, schoolId)];
    if (classId !== undefined) conditions.push(eq(erpStudentAttendance.classId, classId));
    if (date !== undefined) conditions.push(eq(erpStudentAttendance.attendanceDate, date));
    if (from !== undefined) conditions.push(gte(erpStudentAttendance.attendanceDate, from));
    if (to !== undefined) conditions.push(lte(erpStudentAttendance.attendanceDate, to));
    const whereClause = and(...conditions);

    const items = await db
      .select({
        id: erpStudentAttendance.id,
        classId: erpStudentAttendance.classId,
        className: erpSchoolClasses.name,
        studentUserId: erpStudentAttendance.studentUserId,
        studentName: users.name,
        attendanceDate: erpStudentAttendance.attendanceDate,
        status: erpStudentAttendance.status,
        notes: erpStudentAttendance.notes,
        recordedBy: erpStudentAttendance.recordedBy,
        createdAt: erpStudentAttendance.createdAt,
      })
      .from(erpStudentAttendance)
      .innerJoin(users, eq(users.id, erpStudentAttendance.studentUserId))
      .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpStudentAttendance.classId))
      .where(whereClause)
      .orderBy(desc(erpStudentAttendance.attendanceDate), desc(erpStudentAttendance.id))
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const totalRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(erpStudentAttendance)
      .innerJoin(users, eq(users.id, erpStudentAttendance.studentUserId))
      .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpStudentAttendance.classId))
      .where(whereClause);

    res
      .status(200)
      .json(successResponse({ items, total: totalRows[0]?.total ?? 0, page, pageSize }));
  }
);

const attendanceBulkBodySchema = z.object({
  classId: z.number().int().positive(),
  date: z.string().regex(dateRegex),
  entries: z
    .array(
      z.object({
        studentUserId: z.string().min(1),
        status: z.enum(attendanceStatuses),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(500),
});

erpAcademicsRouter.post(
  "/attendance/bulk",
  requireSession,
  erpGuard("ATTENDANCE_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const userId = erpReq.session.user.id;
    const parsed = attendanceBulkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid attendance submission", "VALIDATION_ERROR"));
      return;
    }
    const { classId, date, entries: rawEntries } = parsed.data;
    if (!(await findSchoolClass(schoolId, classId))) {
      res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
      return;
    }
    const entryMap = new Map(rawEntries.map((entry) => [entry.studentUserId, entry]));
    const entries = Array.from(entryMap.values());
    const studentIds = Array.from(entryMap.keys());
    const studentCheck = await validateStudentUsers(studentIds);
    if (!studentCheck.ok) {
      res
        .status(400)
        .json(
          errorResponse("Some students were not found or are not students", "STUDENT_NOT_FOUND")
        );
      return;
    }
    const rows = await db
      .insert(erpStudentAttendance)
      .values(
        entries.map((entry) => ({
          schoolId,
          classId,
          studentUserId: entry.studentUserId,
          attendanceDate: date,
          status: entry.status,
          notes: entry.notes ?? null,
          recordedBy: userId,
        }))
      )
      .onConflictDoUpdate({
        target: [
          erpStudentAttendance.classId,
          erpStudentAttendance.studentUserId,
          erpStudentAttendance.attendanceDate,
        ],
        set: {
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          recordedBy: sql`excluded.recorded_by`,
        },
      })
      .returning();
    res.status(200).json(successResponse({ saved: rows.length, attendance: rows }));
  }
);

const attendanceSummaryQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(dateRegex).optional(),
  to: z.string().regex(dateRegex).optional(),
});

erpAcademicsRouter.get(
  "/attendance/summary",
  requireSession,
  erpGuard("ATTENDANCE_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = attendanceSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid attendance summary query", "VALIDATION_ERROR"));
      return;
    }
    const { classId, from, to } = parsed.data;
    const conditions: SQL[] = [eq(erpStudentAttendance.schoolId, schoolId)];
    if (classId !== undefined) conditions.push(eq(erpStudentAttendance.classId, classId));
    if (from !== undefined) conditions.push(gte(erpStudentAttendance.attendanceDate, from));
    if (to !== undefined) conditions.push(lte(erpStudentAttendance.attendanceDate, to));
    const summary = await db
      .select({
        studentUserId: erpStudentAttendance.studentUserId,
        studentName: users.name,
        present: sql<number>`(count(*) filter (where ${erpStudentAttendance.status} = 'present'))::int`,
        absent: sql<number>`(count(*) filter (where ${erpStudentAttendance.status} = 'absent'))::int`,
        late: sql<number>`(count(*) filter (where ${erpStudentAttendance.status} = 'late'))::int`,
        leave: sql<number>`(count(*) filter (where ${erpStudentAttendance.status} = 'leave'))::int`,
        halfDay: sql<number>`(count(*) filter (where ${erpStudentAttendance.status} = 'half_day'))::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(erpStudentAttendance)
      .innerJoin(users, eq(users.id, erpStudentAttendance.studentUserId))
      .where(and(...conditions))
      .groupBy(erpStudentAttendance.studentUserId, users.name)
      .orderBy(users.name);
    res.status(200).json(successResponse({ summary }));
  }
);

// ---------------------------------------------------------------------------
// Self-service (students)
// ---------------------------------------------------------------------------

erpAcademicsRouter.get("/my/schedule", requireSession, async (req, res) => {
  const erpReq = req as ErpRequest;
  const access = await requireErpAccess(erpReq, res);
  if (!access) return;
  const schoolId = access.schoolId;
  const userId = erpReq.session.user.id;

  let classId: number | null = null;
  if (hasPermission(access, "TIMETABLE_VIEW")) {
    const rawClassId = req.query.classId;
    if (typeof rawClassId === "string" && rawClassId !== "") {
      const parsedClassId = Number.parseInt(rawClassId, 10);
      if (!Number.isSafeInteger(parsedClassId) || parsedClassId <= 0) {
        res.status(400).json(errorResponse("Invalid class ID", "VALIDATION_ERROR"));
        return;
      }
      classId = parsedClassId;
    }
  }
  if (classId === null) {
    const enrollmentRows = await db
      .select({ classId: erpEnrollments.classId })
      .from(erpEnrollments)
      .where(
        and(
          eq(erpEnrollments.schoolId, schoolId),
          eq(erpEnrollments.studentUserId, userId),
          eq(erpEnrollments.status, "active")
        )
      )
      .orderBy(desc(erpEnrollments.enrolledAt), desc(erpEnrollments.id))
      .limit(1);
    const enrollment = enrollmentRows[0];
    if (!enrollment) {
      res.status(404).json(errorResponse("No active enrollment found", "ENROLLMENT_NOT_FOUND"));
      return;
    }
    classId = enrollment.classId;
  }
  const schoolClass = await findSchoolClass(schoolId, classId);
  if (!schoolClass) {
    res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
    return;
  }
  const slots = await selectTimetableSlots(schoolId, classId);
  res.status(200).json(successResponse({ classId, className: schoolClass.name, slots }));
});

erpAcademicsRouter.get("/my/grades", requireSession, async (req, res) => {
  const erpReq = req as ErpRequest;
  const access = await requireErpAccess(erpReq, res);
  if (!access) return;
  const schoolId = access.schoolId;
  const userId = erpReq.session.user.id;
  const enrollmentRows = await db
    .select({ id: erpEnrollments.id })
    .from(erpEnrollments)
    .where(
      and(
        eq(erpEnrollments.schoolId, schoolId),
        eq(erpEnrollments.studentUserId, userId),
        eq(erpEnrollments.status, "active")
      )
    )
    .limit(1);
  if (!enrollmentRows[0]) {
    res.status(404).json(errorResponse("No active enrollment found", "ENROLLMENT_NOT_FOUND"));
    return;
  }
  const grades = await selectStudentGrades(schoolId, userId);
  res.status(200).json(successResponse({ grades }));
});
