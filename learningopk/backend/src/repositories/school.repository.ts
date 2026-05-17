import { and, eq, sql, desc, avg, count } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { schools, users, userProgress, quizAttempts } from "../lib/db/schema.js";

export class SchoolRepository {
  async findById(id: number) {
    const rows = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByInviteCode(inviteCode: string) {
    const rows = await db.select().from(schools).where(eq(schools.inviteCode, inviteCode)).limit(1);
    return rows[0] ?? null;
  }

  async findByAdminUserId(userId: string) {
    const rows = await db.select().from(schools).where(eq(schools.adminUserId, userId)).limit(1);
    return rows[0] ?? null;
  }

  async assignUserToSchool(userId: string, schoolId: number) {
    await db.update(users).set({ schoolId }).where(eq(users.id, userId));
  }

  async countStudents(schoolId: number) {
    const rows = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student"), eq(users.status, "active")));
    return rows[0]?.count ?? 0;
  }

  async listStudents(schoolId: number, limit = 100) {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        class: users.class,
        xp: users.xp,
        level: users.level,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student"), eq(users.status, "active")))
      .orderBy(desc(users.xp))
      .limit(limit);
  }

  async getTopStudents(schoolId: number, limit = 5) {
    return this.listStudents(schoolId, limit);
  }

  async getAverageQuizScore(schoolId: number) {
    const rows = await db
      .select({ avgScore: sql<number>`coalesce(avg(${quizAttempts.score}), 0)::int` })
      .from(quizAttempts)
      .innerJoin(users, eq(quizAttempts.userId, users.id))
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")));
    return rows[0]?.avgScore ?? 0;
  }

  async getWeakAreas(schoolId: number) {
    return db
      .select({
        chapterId: userProgress.chapterId,
        avgScore: sql<number>`coalesce(avg(${userProgress.quizBestScore}), 0)::int`,
        studentCount: count(),
      })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")))
      .groupBy(userProgress.chapterId)
      .having(sql`count(*) > 0`)
      .orderBy(sql`coalesce(avg(${userProgress.quizBestScore}), 0)::int`);
  }

  async updateStudentCount(schoolId: number) {
    const newCount = await this.countStudents(schoolId);
    await db.update(schools).set({ studentCount: newCount }).where(eq(schools.id, schoolId));
  }
}

export const schoolRepository = new SchoolRepository();
