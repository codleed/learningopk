import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { boardClasses, boards, subjects } from "../../../lib/db/schema.js";
import { inferLegacyGrade } from "../../../lib/grade-utils.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const curriculumSubjectCreateBodySchema = z.object({
  boardClassId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().url().nullish()
});

const curriculumSubjectUpdateBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  icon: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
  coverImageUrl: z.string().trim().url().nullish()
});

export const subjectsAdminRouter = Router();

subjectsAdminRouter.post("/content/subjects", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumSubjectCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid subject payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const name = parsedBody.data.name.trim();
  const slug = parsedBody.data.slug.trim().toLowerCase();

  const classRows = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug
    })
    .from(boardClasses)
    .where(eq(boardClasses.id, parsedBody.data.boardClassId))
    .limit(1);

  const boardClass = classRows[0];
  if (!boardClass) {
    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${name} (${slug})`,
      status: "failed",
      message: "Class not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Class not found"
    });
    return;
  }

  const legacyGrade = inferLegacyGrade(`${boardClass.slug} ${boardClass.name}`);
  try {
    const insertedRows = await db
      .insert(subjects)
      .values({
        boardId: boardClass.boardId,
        boardClassId: boardClass.id,
        grade: legacyGrade,
        name,
        slug,
        ...(parsedBody.data.icon ? { icon: parsedBody.data.icon.trim() } : {}),
        ...(parsedBody.data.description ? { description: parsedBody.data.description.trim() } : {}),
        ...(parsedBody.data.coverImageUrl ? { coverImageUrl: parsedBody.data.coverImageUrl } : {})
      })
      .returning({
        id: subjects.id,
        boardClassId: subjects.boardClassId,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description,
        coverImageUrl: subjects.coverImageUrl
      });

    const subject = insertedRows[0];
    if (!subject) {
      res.status(500).json({
        error: "Failed to create subject"
      });
      return;
    }

    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${boardClass.name} / ${subject.name}`,
      status: "success",
      message: `Created subject ${subject.slug}`,
      actorId,
      actorName
    });

    // Purge cached subject lists
    void cacheService.delete(CacheKeys.subjectList());
    void cacheService.invalidatePattern("learn:*");

    res.status(201).json({
      subject
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create subject",
      target: `${boardClass.name} / ${name}`,
      status: "failed",
      message: "Subject create failed",
      actorId,
      actorName
    });
    res.status(409).json({
      error: "Subject already exists for class"
    });
  }
});

subjectsAdminRouter.post("/content/subjects/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid subject identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete subject";
  const fallbackTarget = `Subject #${parsedParams.data.id}`;

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      boardClassId: subjects.boardClassId,
      className: boardClasses.name,
      boardName: boards.name
    })
    .from(subjects)
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(subjects.id, parsedParams.data.id))
    .limit(1);
  const subject = subjectRows[0];
  if (!subject) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Subject not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  try {
    await db.delete(subjects).where(eq(subjects.id, subject.id));
  } catch (error) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Subject delete failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to delete subject" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action,
    target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
    status: "success",
    message: `Deleted subject ${subject.slug}`,
    actorId,
    actorName
  });

  // Purge cached subject/chapter lists
  void cacheService.delete(CacheKeys.subjectList());
  void cacheService.delete(CacheKeys.subjectDetail(subject.id));
  void cacheService.invalidatePattern("learn:*");
  void cacheService.invalidatePattern("chapters:list:*");

  res.status(200).json({
    subject: {
      id: subject.id,
      name: subject.name,
      slug: subject.slug
    },
    timestamp: new Date().toISOString()
  });
});

subjectsAdminRouter.post("/content/subjects/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid subject identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = curriculumSubjectUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid subject payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update subject";
  const fallbackTarget = `Subject #${parsedParams.data.id}`;

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      icon: subjects.icon,
      description: subjects.description,
      coverImageUrl: subjects.coverImageUrl,
      boardClassId: subjects.boardClassId,
      className: boardClasses.name,
      boardName: boards.name
    })
    .from(subjects)
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(subjects.id, parsedParams.data.id))
    .limit(1);

  const subject = subjectRows[0];
  if (!subject) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Subject not found",
      actorId,
      actorName
    });
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  try {
    const updatedRows = await db
      .update(subjects)
      .set({
        name: parsedBody.data.name.trim(),
        slug: parsedBody.data.slug.trim().toLowerCase(),
        ...(parsedBody.data.icon !== undefined ? { icon: parsedBody.data.icon?.trim() ?? null } : {}),
        ...(parsedBody.data.description !== undefined ? { description: parsedBody.data.description?.trim() ?? null } : {}),
        ...(parsedBody.data.coverImageUrl !== undefined ? { coverImageUrl: parsedBody.data.coverImageUrl } : {})
      })
      .where(eq(subjects.id, parsedParams.data.id))
      .returning({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description,
        coverImageUrl: subjects.coverImageUrl
      });

    const updatedSubject = updatedRows[0];
    if (!updatedSubject) {
      throw new Error("Failed to update subject");
    }

    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "success",
      message: `Updated subject ${subject.slug}`,
      actorId,
      actorName
    });

    // Purge cached subject/chapter lists
    void cacheService.delete(CacheKeys.subjectList());
    void cacheService.delete(CacheKeys.subjectDetail(subject.id));
    void cacheService.invalidatePattern("learn:*");
    void cacheService.invalidatePattern("chapters:list:*");

    res.status(200).json({
      subject: updatedSubject,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Check if this is a unique constraint violation on slug
    const isSlugConflict = error instanceof Error &&
      (error.message.includes("unique constraint") || error.message.includes("duplicate key")) &&
      error.message.toLowerCase().includes("slug");

    // Also check for PostgreSQL error code 23505 (unique_violation)
    const isUniqueViolation = typeof error === 'object' && error !== null &&
      ('code' in error && error.code === '23505');

    await persistAuditLog({
      scope: "content",
      action,
      target: `${subject.boardName} / ${subject.className || "unassigned"} / ${subject.name}`,
      status: "failed",
      message: error instanceof Error ? error.message : "Subject update failed",
      actorId,
      actorName
    });

    if (isSlugConflict || (isUniqueViolation && error instanceof Error && error.message.toLowerCase().includes("slug"))) {
      res.status(409).json({ error: "Subject slug already in use" });
    } else {
      res.status(500).json({ error: "Failed to update subject" });
    }
  }
});
