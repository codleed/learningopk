import { eq, and, sql, count, desc } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import {
  classrooms,
  classroomStudents,
  assignments,
  assignmentSubmissions,
  users,
  userProgress,
  chapters,
  subjects,
  quizAttempts,
} from "../lib/db/schema.js";
import { classroomRepository } from "../repositories/classroom.repository.js";

export class TeacherService {
  async getStudentProgressInClassroom(classroomId: number) {
    const students = await classroomRepository.getStudents(classroomId);

    const assignmentList = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId));

    const totalAssignments = assignmentList.length;

    const progress = await Promise.all(
      students.map(async (student) => {
        // Completed assignments
        const completedRows = await db
          .select({ count: count() })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.studentId, student.id),
              eq(assignmentSubmissions.status, "submitted")
            )
          );
        const completed = completedRows[0]?.count ?? 0;

        // Average quiz score
        const avgScoreRows = await db
          .select({ avgScore: sql<number>`coalesce(avg(${assignmentSubmissions.score}), 0)::int` })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.studentId, student.id),
              eq(assignmentSubmissions.status, "submitted")
            )
          );
        const avgScore = avgScoreRows[0]?.avgScore ?? 0;

        // Last active date
        const lastActiveRows = await db
          .select({ visitedAt: userProgress.visitedAt })
          .from(userProgress)
          .where(eq(userProgress.userId, student.id))
          .orderBy(desc(userProgress.visitedAt))
          .limit(1);
        const lastActive = lastActiveRows[0]?.visitedAt ?? null;

        return {
          ...student,
          assignmentsCompleted: completed,
          totalAssignments,
          avgScore,
          lastActive,
        };
      })
    );

    return progress;
  }

  async getDifferentiationSuggestions(classroomId: number) {
    const students = await classroomRepository.getStudents(classroomId);

    const suggestions = await Promise.all(
      students.map(async (student) => {
        // Get weak topics (chapters where avg quiz score < 50%)
        const weakTopics = await db
          .select({
            chapterId: userProgress.chapterId,
            chapterTitle: chapters.title,
            score: userProgress.quizBestScore,
          })
          .from(userProgress)
          .innerJoin(chapters, eq(userProgress.chapterId, chapters.id))
          .where(
            and(
              eq(userProgress.userId, student.id),
              sql`${userProgress.quizBestScore} < 50`
            )
          );

        return {
          studentId: student.id,
          studentName: student.name,
          weakTopics: weakTopics.map((t) => ({
            chapterId: t.chapterId,
            chapterName: t.chapterTitle,
            score: t.score,
          })),
          suggestions: weakTopics.map((t) => `Review ${t.chapterTitle}`),
        };
      })
    );

    return suggestions.filter((s) => s.weakTopics.length > 0);
  }

  async getClassReadiness(classroomId: number) {
    const classroom = await classroomRepository.getClassroomById(classroomId);
    if (!classroom) return [];

    // Get all subjects + chapters for the board/grade
    const chaptersList = await db
      .select({
        chapterId: chapters.id,
        chapterName: chapters.title,
        subjectId: subjects.id,
        subjectName: subjects.name,
      })
      .from(chapters)
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .where(
        and(
          eq(subjects.boardId, classroom.boardId),
          eq(subjects.grade, classroom.grade as "9" | "10")
        )
      );

    const students = await classroomRepository.getStudents(classroomId);
    const totalStudents = students.length;

    const readiness = await Promise.all(
      chaptersList.map(async (chapter) => {
        // Get quiz attempts for this chapter from students in the classroom
        const scores = await db
          .select({
            score: quizAttempts.score,
          })
          .from(quizAttempts)
          .innerJoin(users, eq(quizAttempts.userId, users.id))
          .innerJoin(classroomStudents, eq(users.id, classroomStudents.studentId))
          .where(
            and(
              eq(classroomStudents.classroomId, classroomId),
              eq(quizAttempts.quizId, chapter.chapterId) // This is a simplification
            )
          );

        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : 0;

        const above70 = scores.filter((s) => s.score >= 70).length;
        const below50 = scores.filter((s) => s.score < 50).length;

        return {
          chapterId: chapter.chapterId,
          chapterName: chapter.chapterName,
          subjectName: chapter.subjectName,
          avgScore,
          studentsAbove70Percent: totalStudents > 0 ? Math.round((above70 / totalStudents) * 100) : 0,
          studentsBelow50Percent: totalStudents > 0 ? Math.round((below50 / totalStudents) * 100) : 0,
        };
      })
    );

    return readiness;
  }
}

export const teacherService = new TeacherService();
