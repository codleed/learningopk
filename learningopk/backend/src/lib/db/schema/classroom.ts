import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { boards, users } from "../schema.js";

export const assignmentTypeEnum = pgEnum("assignment_type", ["chapter", "quiz", "mock_exam"]);
export const submissionStatusEnum = pgEnum("submission_status", ["not_started", "in_progress", "submitted"]);

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  boardId: integer("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const classroomStudents = pgTable(
  "classroom_students",
  {
    id: serial("id").primaryKey(),
    classroomId: integer("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("classroom_students_classroom_student_idx").on(table.classroomId, table.studentId)]
);

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  type: assignmentTypeEnum("type").notNull(),
  targetId: integer("target_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("not_started"),
    score: integer("score"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [uniqueIndex("assignment_submissions_assignment_student_idx").on(table.assignmentId, table.studentId)]
);

export const classroomAnnouncements = pgTable("classroom_announcements", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
