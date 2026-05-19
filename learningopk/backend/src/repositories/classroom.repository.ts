import { and, eq, sql, count, desc } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import {
  classrooms,
  classroomStudents,
  assignments,
  assignmentSubmissions,
  classroomAnnouncements,
  users,
} from "../lib/db/schema.js";

import { randomBytes } from "node:crypto";

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(bytes[i]! % chars.length);
  }
  return code;
}

export class ClassroomRepository {
  // --- Classrooms ---

  async createClassroom(
    teacherId: string,
    data: {
      name: string;
      boardId: number;
      grade: string;
      description?: string | null | undefined;
    }
  ) {
    const inviteCode = generateInviteCode();
    const inserted = await db
      .insert(classrooms)
      .values({
        teacherId,
        name: data.name,
        boardId: data.boardId,
        grade: data.grade,
        inviteCode,
        description: data.description,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async getClassroomsByTeacher(teacherId: string) {
    return db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.teacherId, teacherId), eq(classrooms.isActive, true)))
      .orderBy(desc(classrooms.createdAt));
  }

  async getClassroomById(classroomId: number) {
    const rows = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateClassroom(
    classroomId: number,
    teacherId: string,
    data: {
      name?: string | undefined;
      boardId?: number | undefined;
      grade?: string | undefined;
      description?: string | null | undefined;
    }
  ) {
    const updated = await db
      .update(classrooms)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(classrooms.id, classroomId), eq(classrooms.teacherId, teacherId)))
      .returning();
    return updated[0] ?? null;
  }

  async deleteClassroom(classroomId: number, teacherId: string) {
    const updated = await db
      .update(classrooms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(classrooms.id, classroomId), eq(classrooms.teacherId, teacherId)))
      .returning();
    return updated[0] ?? null;
  }

  async findByInviteCode(code: string) {
    const rows = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.inviteCode, code), eq(classrooms.isActive, true)))
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Students ---

  async addStudent(classroomId: number, studentId: string) {
    const inserted = await db
      .insert(classroomStudents)
      .values({ classroomId, studentId })
      .returning();
    return inserted[0] ?? null;
  }

  async removeStudent(classroomId: number, studentId: string) {
    await db
      .delete(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.studentId, studentId)));
  }

  async getStudents(classroomId: number) {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        xp: users.xp,
        level: users.level,
        enrolledAt: classroomStudents.enrolledAt,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroomId))
      .orderBy(desc(users.xp));
  }

  async getStudentCount(classroomId: number) {
    const rows = await db
      .select({ count: count() })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));
    return rows[0]?.count ?? 0;
  }

  async isStudentInClassroom(classroomId: number, studentId: string) {
    const rows = await db
      .select({ id: classroomStudents.id })
      .from(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, classroomId), eq(classroomStudents.studentId, studentId)))
      .limit(1);
    return rows.length > 0;
  }

  async getStudentClassroom(studentId: string) {
    const rows = await db
      .select({
        classroom: classrooms,
        enrolledAt: classroomStudents.enrolledAt,
      })
      .from(classroomStudents)
      .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
      .where(
        and(
          eq(classroomStudents.studentId, studentId),
          eq(classrooms.isActive, true)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Assignments ---

  async createAssignment(
    classroomId: number,
    data: {
      type: "chapter" | "quiz" | "mock_exam";
      targetId: number;
      title: string;
      description?: string | null | undefined;
      dueDate?: Date | null | undefined;
      points?: number | undefined;
    }
  ) {
    const inserted = await db
      .insert(assignments)
      .values({
        classroomId,
        type: data.type,
        targetId: data.targetId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        points: data.points ?? 0,
      })
      .returning();
    return inserted[0] ?? null;
  }

  async getAssignments(classroomId: number) {
    return db
      .select({
        assignment: assignments,
        submissionCount: count(assignmentSubmissions.id),
      })
      .from(assignments)
      .leftJoin(assignmentSubmissions, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(eq(assignments.classroomId, classroomId))
      .groupBy(assignments.id)
      .orderBy(desc(assignments.createdAt));
  }

  async getAssignmentById(assignmentId: number) {
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateAssignment(
    assignmentId: number,
    data: {
      title?: string | undefined;
      description?: string | null | undefined;
      dueDate?: Date | null | undefined;
      points?: number | undefined;
    }
  ) {
    const updated = await db
      .update(assignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId))
      .returning();
    return updated[0] ?? null;
  }

  async deleteAssignment(assignmentId: number) {
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
  }

  // --- Submissions ---

  async getSubmission(assignmentId: number, studentId: string) {
    const rows = await db
      .select()
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.studentId, studentId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertSubmission(
    assignmentId: number,
    studentId: string,
    data: {
      status?: "not_started" | "in_progress" | "submitted";
      score?: number | null;
      startedAt?: Date | null;
      submittedAt?: Date | null;
    }
  ) {
    const result = await db
      .insert(assignmentSubmissions)
      .values({
        assignmentId,
        studentId,
        status: data.status ?? "not_started",
        score: data.score,
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
      })
      .onConflictDoUpdate({
        target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
        set: {
          ...(data.status && { status: data.status }),
          ...(data.score !== undefined && { score: data.score }),
          ...(data.startedAt && { startedAt: data.startedAt }),
          ...(data.submittedAt && { submittedAt: data.submittedAt }),
        },
      })
      .returning();
    return result[0] ?? null;
  }

  async getSubmissions(assignmentId: number) {
    return db
      .select({
        submission: assignmentSubmissions,
        studentName: users.name,
        studentEmail: users.email,
      })
      .from(assignmentSubmissions)
      .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
      .where(eq(assignmentSubmissions.assignmentId, assignmentId))
      .orderBy(desc(assignmentSubmissions.submittedAt));
  }

  async getSubmissionsForStudentInClassroom(classroomId: number, studentId: string) {
    return db
      .select({
        assignmentId: assignmentSubmissions.assignmentId,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.score,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(
        and(
          eq(assignments.classroomId, classroomId),
          eq(assignmentSubmissions.studentId, studentId)
        )
      );
  }

  // --- Announcements ---

  async createAnnouncement(classroomId: number, teacherId: string, content: string, pinned = false) {
    const inserted = await db
      .insert(classroomAnnouncements)
      .values({ classroomId, teacherId, content, pinned })
      .returning();
    return inserted[0] ?? null;
  }

  async getAnnouncements(classroomId: number, limit = 50) {
    return db
      .select()
      .from(classroomAnnouncements)
      .where(eq(classroomAnnouncements.classroomId, classroomId))
      .orderBy(desc(classroomAnnouncements.createdAt))
      .limit(limit);
  }

  async deleteAnnouncement(announcementId: number, teacherId: string) {
    await db
      .delete(classroomAnnouncements)
      .where(
        and(
          eq(classroomAnnouncements.id, announcementId),
          eq(classroomAnnouncements.teacherId, teacherId)
        )
      );
  }

  // --- Alerts / Struggling students ---

  async getStrugglingStudents(classroomId: number) {
    // Students with avg quiz score < 50% in any chapter
    const lowScores = await db
      .select({
        studentId: users.id,
        studentName: users.name,
        avgScore: sql<number>`coalesce(avg(${assignmentSubmissions.score}), 0)::int`,
      })
      .from(assignmentSubmissions)
      .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(
        and(
          eq(assignments.classroomId, classroomId),
          eq(assignmentSubmissions.status, "submitted")
        )
      )
      .groupBy(users.id)
      .having(sql`coalesce(avg(${assignmentSubmissions.score}), 0) < 50`);

    return lowScores;
  }
}

export const classroomRepository = new ClassroomRepository();
