import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { schools, users } from "../../schema.js";
import { erpEmployees } from "./hrm.js";

// ---------------------------------------------------------------------------
// Academic calendar (Gauzy has fiscal dates on organization; here explicit)
// ---------------------------------------------------------------------------

export const erpAcademicYears = pgTable(
  "erp_academic_years",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "2026-27"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_academic_years_school_name_idx").on(table.schoolId, table.name),
    index("erp_academic_years_school_current_idx").on(table.schoolId, table.isCurrent),
  ]
);

export const erpTerms = pgTable(
  "erp_terms",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: integer("academic_year_id")
      .notNull()
      .references(() => erpAcademicYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Term 1"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_terms_year_name_idx").on(table.academicYearId, table.name),
    index("erp_terms_school_current_idx").on(table.schoolId, table.isCurrent),
  ]
);

// ---------------------------------------------------------------------------
// Classes & enrollment — students are existing `users` (role=student)
// ---------------------------------------------------------------------------

export const erpSchoolClasses = pgTable(
  "erp_school_classes",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: integer("academic_year_id")
      .notNull()
      .references(() => erpAcademicYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "9-A"
    gradeLevel: text("grade_level").notNull(), // "9" | "10"
    section: text("section"), // "A"
    capacity: integer("capacity").notNull().default(40),
    classTeacherId: integer("class_teacher_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    room: text("room"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_school_classes_year_name_idx").on(table.academicYearId, table.name),
    index("erp_school_classes_school_idx").on(table.schoolId, table.gradeLevel),
  ]
);

export const erpEnrollments = pgTable(
  "erp_enrollments",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => erpSchoolClasses.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rollNumber: text("roll_number"),
    status: text("status").notNull().default("active"), // active|graduated|withdrawn|suspended
    enrolledAt: date("enrolled_at").notNull(),
    endedAt: date("ended_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // One active enrollment per student per class
    uniqueIndex("erp_enrollments_class_student_idx").on(table.classId, table.studentUserId),
    index("erp_enrollments_student_idx").on(table.studentUserId, table.status),
    index("erp_enrollments_school_status_idx").on(table.schoolId, table.status),
  ]
);

// ---------------------------------------------------------------------------
// Subjects taught in a class + timetable
// ---------------------------------------------------------------------------

export const erpClassSubjects = pgTable(
  "erp_class_subjects",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => erpSchoolClasses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subjectCode: text("subject_code"),
    teacherId: integer("teacher_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_class_subjects_class_name_idx").on(table.classId, table.name),
    index("erp_class_subjects_teacher_idx").on(table.teacherId),
  ]
);

export const erpTimetableSlots = pgTable(
  "erp_timetable_slots",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => erpSchoolClasses.id, { onDelete: "cascade" }),
    classSubjectId: integer("class_subject_id")
      .notNull()
      .references(() => erpClassSubjects.id, { onDelete: "cascade" }),
    weekday: text("weekday").notNull(), // monday..sunday
    periodNumber: integer("period_number").notNull(),
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(), // "08:45"
    room: text("room"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_timetable_slot_unique_idx").on(
      table.classId,
      table.weekday,
      table.periodNumber
    ),
    index("erp_timetable_slots_class_idx").on(table.classId),
    index("erp_timetable_slots_teacher_idx").on(table.classSubjectId, table.weekday),
  ]
);

// ---------------------------------------------------------------------------
// Exams & gradebook
// ---------------------------------------------------------------------------

export const erpExams = pgTable(
  "erp_exams",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    termId: integer("term_id").references(() => erpTerms.id, { onDelete: "set null" }),
    classSubjectId: integer("class_subject_id")
      .notNull()
      .references(() => erpClassSubjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    examDate: date("exam_date").notNull(),
    totalMarks: integer("total_marks").notNull().default(100),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_exams_subject_name_idx").on(table.classSubjectId, table.name),
    index("erp_exams_school_date_idx").on(table.schoolId, table.examDate),
  ]
);

export const erpGrades = pgTable(
  "erp_grades",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    examId: integer("exam_id")
      .notNull()
      .references(() => erpExams.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    marksObtained: numeric("marks_obtained", { precision: 6, scale: 2 }),
    remarks: text("remarks"),
    gradedBy: text("graded_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    gradedAt: timestamp("graded_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_grades_exam_student_idx").on(table.examId, table.studentUserId),
    index("erp_grades_student_idx").on(table.studentUserId),
  ]
);

// ---------------------------------------------------------------------------
// Student attendance (parallel to staff attendance)
// ---------------------------------------------------------------------------

export const erpStudentAttendance = pgTable(
  "erp_student_attendance",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => erpSchoolClasses.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: text("status").notNull().default("present"), // present|absent|late|leave|half_day
    notes: text("notes"),
    recordedBy: text("recorded_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_student_attendance_unique_idx").on(
      table.classId,
      table.studentUserId,
      table.attendanceDate
    ),
    index("erp_student_attendance_student_idx").on(table.studentUserId, table.attendanceDate),
    index("erp_student_attendance_school_date_idx").on(table.schoolId, table.attendanceDate),
  ]
);
