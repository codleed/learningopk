import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db/index.js";
import { schools, users } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { requireAdminRole } from "../lib/admin.js";
import { schoolRepository } from "../repositories/school.repository.js";
import { errorResponse, successResponse } from "../lib/response.js";
import { eq } from "drizzle-orm";

export const schoolsRouter = Router();

// GET /api/schools/me — get current user's school
schoolsRouter.get("/me", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const userRows = await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1);
  const schoolId = userRows[0]?.schoolId;

  if (!schoolId) {
    res.status(200).json(successResponse(null));
    return;
  }

  const school = await schoolRepository.findById(schoolId);
  res.status(200).json(successResponse(school));
});

// POST /api/schools/join — student joins via invite code
const joinBodySchema = z.object({ inviteCode: z.string().min(3).max(50) });

schoolsRouter.post("/join", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const parsed = joinBodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid invite code", "VALIDATION_ERROR"));
    return;
  }

  const { inviteCode } = parsed.data;
  const school = await schoolRepository.findByInviteCode(inviteCode);

  if (!school) {
    res.status(404).json(errorResponse("School not found", "SCHOOL_NOT_FOUND"));
    return;
  }

  const userId = authedReq.session.user.id;
  await schoolRepository.assignUserToSchool(userId, school.id);
  await schoolRepository.updateStudentCount(school.id);

  res.status(200).json(successResponse({ schoolId: school.id, name: school.name }));
});

// GET /api/schools/dashboard — school admin analytics
schoolsRouter.get("/dashboard", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const school = await schoolRepository.findByAdminUserId(userId);
  if (!school) {
    res.status(403).json(errorResponse("You are not a school admin", "FORBIDDEN"));
    return;
  }

  const [studentCount, topStudents, avgQuizScore, weakAreas] = await Promise.all([
    schoolRepository.countStudents(school.id),
    schoolRepository.getTopStudents(school.id, 5),
    schoolRepository.getAverageQuizScore(school.id),
    schoolRepository.getWeakAreas(school.id),
  ]);

  // Filter weak areas to only those with avg < 70 and take top 10
  const filteredWeakAreas = weakAreas
    .filter((a) => a.avgScore < 70)
    .slice(0, 10);

  res.status(200).json(successResponse({
    school: { id: school.id, name: school.name, slug: school.slug, board: school.board, inviteCode: school.inviteCode, studentCount },
    analytics: { studentCount, avgQuizScore, topStudents, weakAreas: filteredWeakAreas },
  }));
});

// GET /api/schools/students — list students in school
schoolsRouter.get("/students", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const school = await schoolRepository.findByAdminUserId(userId);
  if (!school) {
    res.status(403).json(errorResponse("You are not a school admin", "FORBIDDEN"));
    return;
  }

  const students = await schoolRepository.listStudents(school.id, 200);
  res.status(200).json(successResponse({ students }));
});

// POST /api/schools — platform admin creates a school (admin only)
const createBodySchema = z.object({
  name: z.string().min(2).max(120),
  board: z.string().min(1).max(50),
  adminUserId: z.string().optional(),
});

schoolsRouter.post("/", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const parsed = createBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const { name, board, adminUserId } = parsed.data;
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const inviteCode = "LPK-" + randomBytes(4).toString("hex").toUpperCase();

  const inserted = await db.insert(schools).values({
    name,
    slug,
    board,
    inviteCode,
    adminUserId: adminUserId ?? null,
  }).returning();

  res.status(201).json(successResponse(inserted[0]));
});
