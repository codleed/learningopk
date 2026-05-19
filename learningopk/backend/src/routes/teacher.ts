import { Router } from "express";
import { z } from "zod";
import { and, eq, count } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { classrooms, users, assignments, assignmentSubmissions, classroomAnnouncements } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { requireTeacherRole } from "../lib/session.js";
import { classroomRepository } from "../repositories/classroom.repository.js";
import { successResponse, errorResponse } from "../lib/response.js";

export const teacherRouter = Router();

// All teacher routes require session + teacher role

// GET /api/teacher/classrooms — list teacher's active classrooms
teacherRouter.get("/classrooms", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const teacherClassrooms = await classroomRepository.getClassroomsByTeacher(authedReq.session.user.id);

  // Attach student counts
  const withCounts = await Promise.all(
    teacherClassrooms.map(async (classroom) => {
      const studentCount = await classroomRepository.getStudentCount(classroom.id);
      return { ...classroom, studentCount };
    })
  );

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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const studentsWithCompletion = await Promise.all(
    students.map(async (student) => {
      if (totalAssignments === 0) return { ...student, completionPercent: 100 };

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
      return {
        ...student,
        completionPercent: Math.round((completed / totalAssignments) * 100),
      };
    })
  );

  res.status(200).json(successResponse(studentsWithCompletion));
});

// POST /api/teacher/classrooms/:id/students/:sid — remove student
teacherRouter.post("/classrooms/:id/students/:sid/remove", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const idParam = req.params.id;
  const sidParam = req.params.sid;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
  const studentId = typeof sidParam === "string" ? sidParam : "";

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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const assignmentId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const assignmentId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const assignmentId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const aidParam = req.params.aid;
  const announcementId = typeof aidParam === "string" ? parseInt(aidParam, 10) : NaN;
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

  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

import { teacherService } from "../services/teacher.service.js";

// GET /api/teacher/ai/differentiate/:classroomId — weak topics per student
teacherRouter.get("/ai/differentiate/:classroomId", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireTeacherRole(authedReq, res))) return;

  const idParam = req.params.classroomId;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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

  const idParam = req.params.classroomId;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
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
