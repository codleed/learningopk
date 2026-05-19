import { Router } from "express";
import { z } from "zod";
import { and, eq, count, inArray } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { classrooms, users, assignments, assignmentSubmissions, classroomAnnouncements, classroomStudents } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { requireTeacherRole } from "../lib/session.js";
import { classroomRepository } from "../repositories/classroom.repository.js";
import { successResponse, errorResponse } from "../lib/response.js";
import { teacherService } from "../services/teacher.service.js";

export const teacherRouter = Router();

function parseIdParam(value: unknown): number {
  return typeof value === "string" ? parseInt(value, 10) : NaN;
}

// All teacher routes require session + teacher role

// GET /api/teacher/classrooms/:id — get single classroom
teacherRouter.get("/classrooms/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  res.status(200).json(successResponse(classroom));
});

// GET /api/teacher/classrooms — list teacher's active classrooms
teacherRouter.get("/classrooms", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const teacherClassrooms = await classroomRepository.getClassroomsByTeacher(authedReq.session.user.id);

  // Batch: student counts for all classrooms
  const classroomIds = teacherClassrooms.map((c) => c.id);
  const studentCounts = classroomIds.length > 0
    ? await db
        .select({ classroomId: classroomStudents.classroomId, count: count() })
        .from(classroomStudents)
        .where(inArray(classroomStudents.classroomId, classroomIds))
        .groupBy(classroomStudents.classroomId)
    : [];

  const countMap = new Map(studentCounts.map((row) => [row.classroomId, Number(row.count)]));

  const withCounts = teacherClassrooms.map((classroom) => ({
    ...classroom,
    studentCount: countMap.get(classroom.id) ?? 0,
  }));

  res.status(200).json(successResponse(withCounts));
});

// POST /api/teacher/classrooms — create classroom
const createClassroomSchema = z.object({
  name: z.string().min(1).max(120),
  boardId: z.number().int().positive(),
  grade: z.string().min(1).max(10),
  description: z.string().max(500).optional(),
});

teacherRouter.post("/classrooms", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const parsed = createClassroomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.createClassroom(authedReq.session.user.id, parsed.data);
  if (!classroom) {
    res.status(500).json(errorResponse("Failed to create classroom", "INTERNAL_ERROR"));
    return;
  }

  res.status(201).json(successResponse(classroom));
});

// PATCH /api/teacher/classrooms/:id — update classroom
teacherRouter.patch("/classrooms/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const updateSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    boardId: z.number().int().positive().optional(),
    grade: z.string().min(1).max(10).optional(),
    description: z.string().max(500).optional().nullable(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.updateClassroom(
    classroomId,
    authedReq.session.user.id,
    parsed.data
  );

  if (!classroom) {
    res.status(404).json(errorResponse("Classroom not found", "NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse(classroom));
});

// DELETE /api/teacher/classrooms/:id — archive classroom
teacherRouter.delete("/classrooms/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.deleteClassroom(classroomId, authedReq.session.user.id);
  if (!classroom) {
    res.status(404).json(errorResponse("Classroom not found", "NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse({ archived: true }));
});

// GET /api/teacher/classrooms/:id/students — roster
teacherRouter.get("/classrooms/:id/students", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  // Verify ownership
  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const students = await classroomRepository.getStudents(classroomId);

  // Compute assignment completion % for each student
  const assignmentList = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.classroomId, classroomId));

  const totalAssignments = assignmentList.length;

  if (totalAssignments === 0) {
    const studentsWithEmpty = students.map((student) => ({
      ...student,
      completionPercent: null as number | null,
    }));
    res.status(200).json(successResponse(studentsWithEmpty));
    return;
  }

  // Batch: completed counts per student
  const studentIds = students.map((s) => s.id);
  const completedCounts = studentIds.length > 0
    ? await db
        .select({
          studentId: assignmentSubmissions.studentId,
          completed: count(),
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

  const completedMap = new Map(completedCounts.map((row) => [row.studentId, Number(row.completed)]));

  const studentsWithCompletion = students.map((student) => {
    const completed = completedMap.get(student.id) ?? 0;
    return {
      ...student,
      completionPercent: Math.round((completed / totalAssignments) * 100),
    };
  });

  res.status(200).json(successResponse(studentsWithCompletion));
});

// POST /api/teacher/classrooms/:id/students/:sid — remove student
teacherRouter.post("/classrooms/:id/students/:sid/remove", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  const studentId = typeof req.params.sid === "string" ? req.params.sid : "";

  if (isNaN(classroomId) || !studentId) {
    res.status(400).json(errorResponse("Invalid parameters", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  await classroomRepository.removeStudent(classroomId, studentId);
  res.status(200).json(successResponse({ removed: true }));
});

// GET /api/teacher/classrooms/:id/assignments — list assignments
teacherRouter.get("/classrooms/:id/assignments", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const studentCount = await classroomRepository.getStudentCount(classroomId);
  const assignmentRows = await classroomRepository.getAssignments(classroomId);

  const result = assignmentRows.map((row) => ({
    ...row.assignment,
    submissionCount: Number(row.submissionCount),
    studentCount,
  }));

  res.status(200).json(successResponse(result));
});

// POST /api/teacher/classrooms/:id/assignments — create assignment
const createAssignmentSchema = z.object({
  type: z.enum(["chapter", "quiz", "mock_exam"]),
  targetId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  points: z.number().int().min(0).max(1000).optional(),
});

teacherRouter.post("/classrooms/:id/assignments", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;

  const assignment = await classroomRepository.createAssignment(classroomId, {
    ...parsed.data,
    dueDate,
  });

  if (!assignment) {
    res.status(500).json(errorResponse("Failed to create assignment", "INTERNAL_ERROR"));
    return;
  }

  res.status(201).json(successResponse(assignment));
});

// PATCH /api/teacher/assignments/:id — update assignment
teacherRouter.patch("/assignments/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const assignmentId = parseIdParam(req.params.id);
  if (isNaN(assignmentId)) {
    res.status(400).json(errorResponse("Invalid assignment ID", "VALIDATION_ERROR"));
    return;
  }

  const assignment = await classroomRepository.getAssignmentById(assignmentId);
  if (!assignment) {
    res.status(404).json(errorResponse("Assignment not found", "NOT_FOUND"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(assignment.classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    points: z.number().int().min(0).max(1000).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const dueDate = parsed.data.dueDate === null ? null : parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;

  const updated = await classroomRepository.updateAssignment(assignmentId, {
    ...(parsed.data.title && { title: parsed.data.title }),
    ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    ...(dueDate !== undefined && { dueDate }),
    ...(parsed.data.points !== undefined && { points: parsed.data.points }),
  });

  res.status(200).json(successResponse(updated));
});

// DELETE /api/teacher/assignments/:id — delete assignment
teacherRouter.delete("/assignments/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const assignmentId = parseIdParam(req.params.id);
  if (isNaN(assignmentId)) {
    res.status(400).json(errorResponse("Invalid assignment ID", "VALIDATION_ERROR"));
    return;
  }

  const assignment = await classroomRepository.getAssignmentById(assignmentId);
  if (!assignment) {
    res.status(404).json(errorResponse("Assignment not found", "NOT_FOUND"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(assignment.classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  await classroomRepository.deleteAssignment(assignmentId);
  res.status(200).json(successResponse({ deleted: true }));
});

// GET /api/teacher/assignments/:id/submissions — all student submissions
teacherRouter.get("/assignments/:id/submissions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const assignmentId = parseIdParam(req.params.id);
  if (isNaN(assignmentId)) {
    res.status(400).json(errorResponse("Invalid assignment ID", "VALIDATION_ERROR"));
    return;
  }

  const assignment = await classroomRepository.getAssignmentById(assignmentId);
  if (!assignment) {
    res.status(404).json(errorResponse("Assignment not found", "NOT_FOUND"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(assignment.classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const submissions = await classroomRepository.getSubmissions(assignmentId);
  res.status(200).json(successResponse(submissions));
});

// GET /api/teacher/classrooms/:id/announcements — list recent
teacherRouter.get("/classrooms/:id/announcements", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const announcements = await classroomRepository.getAnnouncements(classroomId);
  res.status(200).json(successResponse(announcements));
});

// POST /api/teacher/classrooms/:id/announcements — create
teacherRouter.post("/classrooms/:id/announcements", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const announceSchema = z.object({
    content: z.string().min(1).max(2000),
    pinned: z.boolean().optional(),
  });

  const parsed = announceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const announcement = await classroomRepository.createAnnouncement(
    classroomId,
    authedReq.session.user.id,
    parsed.data.content,
    parsed.data.pinned ?? false
  );

  res.status(201).json(successResponse(announcement));
});

// DELETE /api/teacher/classrooms/:id/announcements/:aid — delete
teacherRouter.delete("/classrooms/:id/announcements/:aid", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const announcementId = parseIdParam(req.params.aid);
  if (isNaN(announcementId)) {
    res.status(400).json(errorResponse("Invalid announcement ID", "VALIDATION_ERROR"));
    return;
  }

  await classroomRepository.deleteAnnouncement(announcementId, authedReq.session.user.id);
  res.status(200).json(successResponse({ deleted: true }));
});

// GET /api/teacher/classrooms/:id/alerts — struggling students
teacherRouter.get("/classrooms/:id/alerts", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.id);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const alerts = await classroomRepository.getStrugglingStudents(classroomId);
  res.status(200).json(successResponse(alerts));
});

// ─── AI Teacher Tools ───

// GET /api/teacher/ai/differentiate/:classroomId — weak topics per student
teacherRouter.get("/ai/differentiate/:classroomId", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.classroomId);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const suggestions = await teacherService.getDifferentiationSuggestions(classroomId);
  res.status(200).json(successResponse(suggestions));
});

// GET /api/teacher/ai/readiness/:classroomId — class readiness heatmap
teacherRouter.get("/ai/readiness/:classroomId", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = parseIdParam(req.params.classroomId);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return;
  }

  const readiness = await teacherService.getClassReadiness(classroomId);
  res.status(200).json(successResponse(readiness));
});

// POST /api/teacher/ai/generate-quiz — AI quiz generation
const generateQuizSchema = z.object({
  chapterId: z.number().int().positive(),
  questionCount: z.number().int().min(1).max(30),
  types: z.array(z.enum(["mcq", "short", "fill_in_blanks"])),
  board: z.string().min(1),
});

teacherRouter.post("/ai/generate-quiz", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const parsed = generateQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const { chapterId, questionCount, types, board } = parsed.data;

  // Generate board-specific placeholder questions for teacher review
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    id: i + 1,
    type: types[i % types.length],
    question: `${board} Sample question ${i + 1} for chapter ${chapterId}`,
    options: types[i % types.length] === "mcq"
      ? { a: `Option A for Q${i + 1}`, b: `Option B for Q${i + 1}`, c: `Option C for Q${i + 1}`, d: `Option D for Q${i + 1}` }
      : undefined,
    correctOption: types[i % types.length] === "mcq" ? "a" : undefined,
    marks: 1,
  }));

  res.status(200).json(successResponse({ chapterId, board, questions }));
});

// POST /api/teacher/ai/lesson-plan — AI lesson planner
const lessonPlanSchema = z.object({
  chapterId: z.number().int().positive(),
  durationMinutes: z.number().int().min(15).max(180),
  board: z.string().min(1),
});

teacherRouter.post("/ai/lesson-plan", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const parsed = lessonPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const { chapterId, durationMinutes, board } = parsed.data;

  const lessonPlan = {
    learningObjectives: ["Understand core concepts", "Apply formulas to problems", "Connect concepts to exam patterns"],
    warmupQuestion: `Quick review question related to chapter ${chapterId} concepts`,
    keyConcepts: [
      { concept: "Main topic", explanation: `Key idea from chapter ${chapterId}`, example: "Application example" },
    ],
    practiceProblems: Array.from({ length: 3 }, (_, i) => ({
      problem: `Practice problem ${i + 1} for chapter ${chapterId}`,
      difficulty: i === 0 ? "easy" : i === 1 ? "medium" : "hard",
    })),
    homework: `Assign the remaining ${board} textbook exercises from chapter ${chapterId}`,
    durationMinutes,
    board,
  };

  res.status(200).json(successResponse(lessonPlan));
});
