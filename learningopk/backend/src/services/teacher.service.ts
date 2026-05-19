import { eq, and, sql, count, desc, inArray } from "drizzle-orm";
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
  quizzes,
} from "../lib/db/schema.js";
import { classroomRepository } from "../repositories/classroom.repository.js";

export class TeacherService {
  async getStudentProgressInClassroom(classroomId: number) {
    const students = await classroomRepository.getStudents(classroomId);
    const studentIds = students.map((s) => s.id);

    const assignmentList = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classroomId, classroomId));

    const totalAssignments = assignmentList.length;

    // Batch: completed counts + avg scores per student
    const submissionAgg = studentIds.length > 0
      ? await db
          .select({
            studentId: assignmentSubmissions.studentId,
            completed: count(),
            avgScore: sql<number>`coalesce(avg(${assignmentSubmissions.score}), 0)::int`,
          })
          .from(assignmentSubmissions)
          .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
          .where(
            and(
              eq(assignments.classroomId, classroomId),
              eq(assignmentSubmissions.status, "submitted"),
              inArray(assignmentSubmissions.studentId, studentIds)
            )
          )
          .groupBy(assignmentSubmissions.studentId)
      : [];

    const submissionMap = new Map(submissionAgg.map((row) => [row.studentId, row]));

    // Batch: last active per student
    const lastActiveRows = studentIds.length > 0
      ? await db
          .select({ userId: userProgress.userId, visitedAt: userProgress.visitedAt })
          .from(userProgress)
          .where(inArray(userProgress.userId, studentIds))
          .orderBy(desc(userProgress.visitedAt))
      : [];

    const lastActiveMap = new Map<string, Date>();
    for (const row of lastActiveRows) {
      if (!lastActiveMap.has(row.userId)) {
        lastActiveMap.set(row.userId, row.visitedAt);
      }
    }

    return students.map((student) => {
      const sub = submissionMap.get(student.id);
      return {
        ...student,
        assignmentsCompleted: sub?.completed ?? 0,
        totalAssignments,
        avgScore: sub?.avgScore ?? 0,
        lastActive: lastActiveMap.get(student.id) ?? null,
      };
    });
  }

  async getDifferentiationSuggestions(classroomId: number) {
    const students = await classroomRepository.getStudents(classroomId);
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    // Batch: weak topics for all students in one query
    const weakTopics = await db
      .select({
        userId: userProgress.userId,
        chapterId: userProgress.chapterId,
        chapterTitle: chapters.title,
        score: userProgress.quizBestScore,
      })
      .from(userProgress)
      .innerJoin(chapters, eq(userProgress.chapterId, chapters.id))
      .where(
        and(
          inArray(userProgress.userId, studentIds),
          sql`${userProgress.quizBestScore} < 50`
        )
      );

    const topicsByStudent = new Map<string, typeof weakTopics>();
    for (const row of weakTopics) {
      const arr = topicsByStudent.get(row.userId) ?? [];
      arr.push(row);
      topicsByStudent.set(row.userId, arr);
    }

    const suggestions = students
      .map((student) => {
        const topics = topicsByStudent.get(student.id) ?? [];
        return {
          studentId: student.id,
          studentName: student.name,
          weakTopics: topics.map((t) => ({
            chapterId: t.chapterId,
            chapterName: t.chapterTitle,
            score: t.score,
          })),
          suggestions: topics.map((t) => `Review ${t.chapterTitle}`),
        };
      })
      .filter((s) => s.weakTopics.length > 0);

    return suggestions;
  }

  async getClassReadiness(classroomId: number) {
    const classroom = await classroomRepository.getClassroomById(classroomId);
    if (!classroom) return [];
    if (classroom.grade !== "9" && classroom.grade !== "10") return [];

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
          eq(subjects.grade, classroom.grade)
        )
      );

    const students = await classroomRepository.getStudents(classroomId);
    const totalStudents = students.length;

    const readiness = await Promise.all(
      chaptersList.map(async (chapter) => {
        // Get quiz attempts for this chapter from students in the classroom
        // Join through quizzes table: quizAttempts.quizId -> quizzes.id -> quizzes.chapterId
        const scores = await db
          .select({
            score: quizAttempts.score,
          })
          .from(quizAttempts)
          .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
          .innerJoin(users, eq(quizAttempts.userId, users.id))
          .innerJoin(classroomStudents, eq(users.id, classroomStudents.studentId))
          .where(
            and(
              eq(classroomStudents.classroomId, classroomId),
              eq(quizzes.chapterId, chapter.chapterId)
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
