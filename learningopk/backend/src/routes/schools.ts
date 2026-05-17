import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { and, eq, count } from "drizzle-orm";
import { db } from "../lib/db/index.js";
import { schools, users } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { requireAdminRole } from "../lib/admin.js";
import { schoolRepository } from "../repositories/school.repository.js";
import { errorResponse, successResponse } from "../lib/response.js";
import { schoolJoinRateLimiter } from "../middleware/rate-limits.js";

export const schoolsRouter = Router();

// GET /api/schools — list all schools (admin only)
schoolsRouter.get("/", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const allSchools = await db.select({
    id: schools.id,
    name: schools.name,
    slug: schools.slug,
    board: schools.board,
    inviteCode: schools.inviteCode,
    studentCount: schools.studentCount,
    adminUserId: schools.adminUserId,
    createdAt: schools.createdAt,
  }).from(schools).orderBy(schools.createdAt);

  res.status(200).json(successResponse({ schools: allSchools }));
});

// DELETE /api/schools/:id — delete a school (admin only)
schoolsRouter.delete("/:id", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const idParam = req.params.id;
  if (typeof idParam !== "string" || !idParam) {
    res.status(400).json(errorResponse("Invalid school ID", "VALIDATION_ERROR"));
    return;
  }
  const schoolId = parseInt(idParam, 10);
  if (isNaN(schoolId)) {
    res.status(400).json(errorResponse("Invalid school ID", "VALIDATION_ERROR"));
    return;
  }

  // Check if school exists
  const existing = await schoolRepository.findById(schoolId);
  if (!existing) {
    res.status(404).json(errorResponse("School not found", "SCHOOL_NOT_FOUND"));
    return;
  }

  // Unassign all students from this school first
  await db.update(users).set({ schoolId: null }).where(eq(users.schoolId, schoolId));

  // Delete the school
  await db.delete(schools).where(eq(schools.id, schoolId));

  res.status(200).json(successResponse({ deleted: true }));
});

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

schoolsRouter.post("/join", requireSession, schoolJoinRateLimiter, async (req, res) => {
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

  // Prevent users from joining multiple schools
  const userRows = await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, userId)).limit(1);
  if (userRows[0]?.schoolId) {
    res.status(400).json(errorResponse("You are already in a school", "ALREADY_IN_SCHOOL"));
    return;
  }

  // Atomic transaction: assign user and update count
  await db.transaction(async (tx) => {
    await tx.update(users).set({ schoolId: school.id }).where(eq(users.id, userId));
    const countResult = await tx
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.schoolId, school.id), eq(users.role, "student"), eq(users.status, "active")));
    await tx.update(schools).set({ studentCount: countResult[0]?.count ?? 0 }).where(eq(schools.id, school.id));
  });

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

// GET /api/schools/check-admin — lightweight check if user is a school admin
schoolsRouter.get("/check-admin", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const school = await schoolRepository.findByAdminUserId(userId);
  if (!school) {
    res.status(403).json(errorResponse("You are not a school admin", "FORBIDDEN"));
    return;
  }

  res.status(200).json(successResponse({ isAdmin: true }));
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

// POST /api/schools — platform admin creates a school with principal account (admin only)
const createBodySchema = z.object({
  name: z.string().min(2).max(120),
  board: z.enum(["federal", "punjab", "sindh"]),
  principalName: z.string().min(2).max(120),
  principalEmail: z.string().email(),
  principalPassword: z.string().min(6).max(100),
  principalClass: z.enum(["9", "10"]),
});

schoolsRouter.post("/", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const parsed = createBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid input", "VALIDATION_ERROR"));
    return;
  }

  const { name, board, principalName, principalEmail, principalPassword, principalClass } = parsed.data;
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const inviteCode = "LPK-" + randomBytes(4).toString("hex").toUpperCase();

  // Create school first
  const inserted = await db.insert(schools).values({
    name,
    slug,
    board,
    inviteCode,
    adminUserId: null,
  }).returning();

  const school = inserted[0];
  if (!school) {
    res.status(500).json(errorResponse("Failed to create school", "INTERNAL_ERROR"));
    return;
  }

  // Create principal account via Better Auth
  const backendUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
  const signUpResponse = await fetch(`${backendUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
    },
    body: JSON.stringify({
      email: principalEmail,
      password: principalPassword,
      name: principalName,
      class: principalClass,
      board: board,
    }),
  });

  if (!signUpResponse.ok) {
    // Rollback: delete the school since principal creation failed
    await db.delete(schools).where(eq(schools.id, school.id));
    const error = await signUpResponse.json().catch(() => ({ message: "Unknown error" }));
    res.status(400).json(errorResponse(
      `Failed to create principal account: ${error.message ?? "Unknown error"}`,
      "PRINCIPAL_CREATION_FAILED"
    ));
    return;
  }

  const signUpData = await signUpResponse.json();
  const userId = signUpData.user?.id;

  if (!userId) {
    await db.delete(schools).where(eq(schools.id, school.id));
    res.status(500).json(errorResponse("Principal created but no user ID returned", "INTERNAL_ERROR"));
    return;
  }

  // Update school with principal as admin and set principal's school_id
  await db.update(schools).set({ adminUserId: userId }).where(eq(schools.id, school.id));
  await db.update(users).set({ schoolId: school.id }).where(eq(users.id, userId));

  res.status(201).json(successResponse({
    school: {
      id: school.id,
      name: school.name,
      slug: school.slug,
      board: school.board,
      inviteCode: school.inviteCode,
    },
    principal: {
      id: userId,
      name: principalName,
      email: principalEmail,
      password: principalPassword, // Return so admin can share it
    },
  }));
});
