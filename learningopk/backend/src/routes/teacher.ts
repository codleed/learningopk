import { Router } from "express";
import { z } from "zod";
import { count, inArray } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { classroomStudents } from "../lib/db/schema.js";
import { requireSession, requireTeacherRole, type AuthenticatedRequest } from "../lib/session.js";
import {
  classroomIdParam,
  requireAssignmentClassroomOwnership,
  requireClassroomOwnership,
  type AssignmentOwnedRequest,
  type ClassroomOwnedRequest,
} from "../middleware/classroom-ownership.js";
import { classroomRepository } from "../repositories/classroom.repository.js";
import { successResponse, errorResponse } from "../lib/response.js";
import { teacherService } from "../services/teacher.service.js";

export const teacherRouter = Router();

// All teacher routes require session + teacher role; classroom-scoped routes
// additionally enforce ownership via requireClassroomOwnership /
// requireAssignmentClassroomOwnership.

// GET /api/teacher/classrooms/:id — get single classroom
teacherRouter.get(
  "/classrooms/:id",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    res.status(200).json(successResponse((req as ClassroomOwnedRequest).classroom));
  }
);

// GET /api/teacher/classrooms — list teacher's active classrooms
teacherRouter.get("/classrooms", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const teacherClassrooms = await classroomRepository.getClassroomsByTeacher(
    authedReq.session.user.id
  );

  // Batch: student counts for all classrooms
  const classroomIds = teacherClassrooms.map((c) => c.id);
  const studentCounts =
    classroomIds.length > 0
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

  const classroom = await classroomRepository.createClassroom(
    authedReq.session.user.id,
    parsed.data
  );
  if (!classroom) {
    res.status(500).json(errorResponse("Failed to create classroom", "INTERNAL_ERROR"));
    return;
  }

  res.status(201).json(successResponse(classroom));
});

// PATCH /api/teacher/classrooms/:id — update classroom
const updateClassroomSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  boardId: z.number().int().positive().optional(),
  grade: z.string().min(1).max(10).optional(),
  description: z.string().max(500).optional().nullable(),
});

teacherRouter.patch("/classrooms/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const classroomId = classroomIdParam("id")(req);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const parsed = updateClassroomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  // Scoped by teacherId inside the repository — 404 when not the owner.
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

  const classroomId = classroomIdParam("id")(req);
  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  // Scoped by teacherId inside the repository — 404 when not the owner.
  const classroom = await classroomRepository.deleteClassroom(
    classroomId,
    authedReq.session.user.id
  );
  if (!classroom) {
    res.status(404).json(errorResponse("Classroom not found", "NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse({ archived: true }));
});

// GET /api/teacher/classrooms/:id/students — roster with progress
teacherRouter.get(
  "/classrooms/:id/students",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const studentsWithProgress = await teacherService.getStudentProgressInClassroom(classroom.id);
    res.status(200).json(successResponse(studentsWithProgress));
  }
);

// POST /api/teacher/classrooms/:id/students/:sid — remove student
teacherRouter.post(
  "/classrooms/:id/students/:sid/remove",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id"), {
    invalidIdMessage: "Invalid parameters",
  }),
  async (req, res) => {
    const studentId = typeof req.params.sid === "string" ? req.params.sid : "";

    if (!studentId) {
      res.status(400).json(errorResponse("Invalid parameters", "VALIDATION_ERROR"));
      return;
    }

    const { classroom } = req as ClassroomOwnedRequest;
    await classroomRepository.removeStudent(classroom.id, studentId);
    res.status(200).json(successResponse({ removed: true }));
  }
);

// GET /api/teacher/classrooms/:id/assignments — list assignments
teacherRouter.get(
  "/classrooms/:id/assignments",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const studentCount = await classroomRepository.getStudentCount(classroom.id);
    const assignmentRows = await classroomRepository.getAssignments(classroom.id);

    const result = assignmentRows.map((row) => ({
      ...row.assignment,
      submissionCount: Number(row.submissionCount),
      studentCount,
    }));

    res.status(200).json(successResponse(result));
  }
);

// POST /api/teacher/classrooms/:id/assignments — create assignment
const createAssignmentSchema = z.object({
  type: z.enum(["chapter", "quiz", "mock_exam"]),
  targetId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
  points: z.number().int().min(0).max(1000).optional(),
});

teacherRouter.post(
  "/classrooms/:id/assignments",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
      return;
    }

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined;
    const { classroom } = req as ClassroomOwnedRequest;

    const assignment = await classroomRepository.createAssignment(classroom.id, {
      ...parsed.data,
      dueDate,
    });

    if (!assignment) {
      res.status(500).json(errorResponse("Failed to create assignment", "INTERNAL_ERROR"));
      return;
    }

    res.status(201).json(successResponse(assignment));
  }
);

// PATCH /api/teacher/assignments/:id — update assignment
const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  points: z.number().int().min(0).max(1000).optional(),
});

teacherRouter.patch(
  "/assignments/:id",
  requireSession,
  requireAssignmentClassroomOwnership("id"),
  async (req, res) => {
    const parsed = updateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
      return;
    }

    const dueDate =
      parsed.data.dueDate === null
        ? null
        : parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : undefined;

    const updated = await classroomRepository.updateAssignment(
      (req as AssignmentOwnedRequest).assignment.id,
      {
        ...(parsed.data.title && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(dueDate !== undefined && { dueDate }),
        ...(parsed.data.points !== undefined && { points: parsed.data.points }),
      }
    );

    res.status(200).json(successResponse(updated));
  }
);

// DELETE /api/teacher/assignments/:id — delete assignment
teacherRouter.delete(
  "/assignments/:id",
  requireSession,
  requireAssignmentClassroomOwnership("id"),
  async (req, res) => {
    await classroomRepository.deleteAssignment((req as AssignmentOwnedRequest).assignment.id);
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// GET /api/teacher/assignments/:id/submissions — all student submissions
teacherRouter.get(
  "/assignments/:id/submissions",
  requireSession,
  requireAssignmentClassroomOwnership("id"),
  async (req, res) => {
    const submissions = await classroomRepository.getSubmissions(
      (req as AssignmentOwnedRequest).assignment.id
    );
    res.status(200).json(successResponse(submissions));
  }
);

// GET /api/teacher/classrooms/:id/announcements — list recent
teacherRouter.get(
  "/classrooms/:id/announcements",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const announcements = await classroomRepository.getAnnouncements(classroom.id);
    res.status(200).json(successResponse(announcements));
  }
);

// POST /api/teacher/classrooms/:id/announcements — create
const announceSchema = z.object({
  content: z.string().min(1).max(2000),
  pinned: z.boolean().optional(),
});

teacherRouter.post(
  "/classrooms/:id/announcements",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const parsed = announceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
      return;
    }

    const authedReq = req as ClassroomOwnedRequest;
    const announcement = await classroomRepository.createAnnouncement(
      authedReq.classroom.id,
      authedReq.session.user.id,
      parsed.data.content,
      parsed.data.pinned ?? false
    );

    res.status(201).json(successResponse(announcement));
  }
);

// DELETE /api/teacher/classrooms/:id/announcements/:aid — delete
teacherRouter.delete(
  "/classrooms/:id/announcements/:aid",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const announcementId = typeof req.params.aid === "string" ? parseInt(req.params.aid, 10) : NaN;
    if (isNaN(announcementId)) {
      res.status(400).json(errorResponse("Invalid announcement ID", "VALIDATION_ERROR"));
      return;
    }

    const authedReq = req as ClassroomOwnedRequest;
    const deleted = await classroomRepository.deleteAnnouncement(
      announcementId,
      authedReq.classroom.id,
      authedReq.session.user.id
    );
    if (!deleted) {
      res.status(404).json(errorResponse("Announcement not found", "NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// GET /api/teacher/classrooms/:id/alerts — struggling students
teacherRouter.get(
  "/classrooms/:id/alerts",
  requireSession,
  requireClassroomOwnership(classroomIdParam("id")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const alerts = await classroomRepository.getStrugglingStudents(classroom.id);
    res.status(200).json(successResponse(alerts));
  }
);

// ─── AI Teacher Tools ───

// GET /api/teacher/ai/differentiate/:classroomId — weak topics per student
teacherRouter.get(
  "/ai/differentiate/:classroomId",
  requireSession,
  requireClassroomOwnership(classroomIdParam("classroomId")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const suggestions = await teacherService.getDifferentiationSuggestions(classroom.id);
    res.status(200).json(successResponse(suggestions));
  }
);

// GET /api/teacher/ai/readiness/:classroomId — class readiness heatmap
teacherRouter.get(
  "/ai/readiness/:classroomId",
  requireSession,
  requireClassroomOwnership(classroomIdParam("classroomId")),
  async (req, res) => {
    const { classroom } = req as ClassroomOwnedRequest;

    const readiness = await teacherService.getClassReadiness(classroom.id);
    res.status(200).json(successResponse(readiness));
  }
);

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

  // Generate board-specific placeholder questions for teacher review (AI integration pending)
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    id: i + 1,
    type: types[i % types.length],
    question: `${board} Sample question ${i + 1} for chapter ${chapterId}`,
    options:
      types[i % types.length] === "mcq"
        ? {
            a: `Option A for Q${i + 1}`,
            b: `Option B for Q${i + 1}`,
            c: `Option C for Q${i + 1}`,
            d: `Option D for Q${i + 1}`,
          }
        : undefined,
    correctOption: types[i % types.length] === "mcq" ? "a" : undefined,
    marks: 1,
  }));

  res.status(200).json(successResponse({ chapterId, board, questions, status: "placeholder" }));
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
    learningObjectives: [
      "Understand core concepts",
      "Apply formulas to problems",
      "Connect concepts to exam patterns",
    ],
    warmupQuestion: `Quick review question related to chapter ${chapterId} concepts`,
    keyConcepts: [
      {
        concept: "Main topic",
        explanation: `Key idea from chapter ${chapterId}`,
        example: "Application example",
      },
    ],
    practiceProblems: Array.from({ length: 3 }, (_, i) => ({
      problem: `Practice problem ${i + 1} for chapter ${chapterId}`,
      difficulty: i === 0 ? "easy" : i === 1 ? "medium" : "hard",
    })),
    homework: `Assign the remaining ${board} textbook exercises from chapter ${chapterId}`,
    durationMinutes,
    board,
    status: "placeholder",
  };

  res.status(200).json(successResponse(lessonPlan));
});
