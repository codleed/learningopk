import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { classroomRepository } from "../repositories/classroom.repository.js";
import { successResponse, errorResponse } from "../lib/response.js";

export const classroomRouter = Router();

// POST /api/classrooms/join — student joins via invite code (no teacher role needed)
const joinBodySchema = z.object({
  inviteCode: z.string().min(6).max(6),
});

classroomRouter.post("/join", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const parsed = joinBodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid invite code", "VALIDATION_ERROR"));
    return;
  }

  const { inviteCode } = parsed.data;
  const classroom = await classroomRepository.findByInviteCode(inviteCode);

  if (!classroom) {
    res.status(404).json(errorResponse("Classroom not found", "NOT_FOUND"));
    return;
  }

  const userId = authedReq.session.user.id;

  // Prevent duplicate joins in the same classroom
  const alreadyJoined = await classroomRepository.isStudentInClassroom(classroom.id, userId);
  if (alreadyJoined) {
    res.status(409).json(errorResponse("You are already in this classroom", "ALREADY_JOINED"));
    return;
  }

  // Prevent enrollment in multiple classrooms (one-classroom-per-student policy)
  const existingEnrollment = await classroomRepository.getStudentClassroom(userId);
  if (existingEnrollment) {
    res.status(409).json(errorResponse("You are already enrolled in a classroom. Leave it before joining another.", "ALREADY_ENROLLED"));
    return;
  }

  await classroomRepository.addStudent(classroom.id, userId);

  res.status(200).json(successResponse({
    classroomId: classroom.id,
    name: classroom.name,
    teacherId: classroom.teacherId,
  }));
});

// GET /api/classrooms/me — get student's enrolled classroom
classroomRouter.get("/me", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const enrollment = await classroomRepository.getStudentClassroom(userId);

  if (!enrollment) {
    res.status(200).json(successResponse(null));
    return;
  }

  res.status(200).json(successResponse(enrollment.classroom));
});

// GET /api/classrooms/:id/announcements — student view announcements
classroomRouter.get("/:id/announcements", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;

  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const userId = authedReq.session.user.id;
  const isMember = await classroomRepository.isStudentInClassroom(classroomId, userId);

  if (!isMember) {
    res.status(403).json(errorResponse("You are not in this classroom", "FORBIDDEN"));
    return;
  }

  const announcements = await classroomRepository.getAnnouncements(classroomId);
  res.status(200).json(successResponse(announcements));
});

// GET /api/classrooms/:id/assignments — student view assignments
classroomRouter.get("/:id/assignments", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const idParam = req.params.id;
  const classroomId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;

  if (isNaN(classroomId)) {
    res.status(400).json(errorResponse("Invalid classroom ID", "VALIDATION_ERROR"));
    return;
  }

  const userId = authedReq.session.user.id;
  if (!userId) {
    res.status(401).json(errorResponse("Unauthorized", "UNAUTHORIZED"));
    return;
  }
  const isMember = await classroomRepository.isStudentInClassroom(classroomId, userId);

  if (!isMember) {
    res.status(403).json(errorResponse("You are not in this classroom", "FORBIDDEN"));
    return;
  }

  const assignmentRows = await classroomRepository.getAssignments(classroomId);

  // Batch: get all submissions for this student in this classroom
  const submissions = await classroomRepository.getSubmissionsForStudentInClassroom(classroomId, userId);
  const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]));

  const withStatus = assignmentRows.map((row) => {
    const submission = submissionMap.get(row.assignment.id);
    return {
      ...row.assignment,
      status: submission?.status ?? "not_started",
      score: submission?.score ?? null,
    };
  });

  res.status(200).json(successResponse(withStatus));
});
