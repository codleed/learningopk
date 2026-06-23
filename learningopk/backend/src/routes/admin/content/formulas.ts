import { and, desc, eq, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { db } from "../../../lib/db/index.js";
import { chapters, formulas, subjects } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

// Formula schemas
const formulaVariableSchema = z.object({
  symbol: z.string().trim().min(1),
  meaning: z.string().trim().min(1)
});

const formulaCreateBodySchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  chapterId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  formulaLatex: z.string().trim().min(1),
  description: z.string().trim().min(1),
  variables: z.array(formulaVariableSchema).default([]),
  tags: z.array(z.string().trim().min(1)).default([])
});

const formulaUpdateBodySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).optional(),
  formulaLatex: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  variables: z.array(formulaVariableSchema).optional(),
  tags: z.array(z.string().trim().min(1)).optional()
});

const formulaListQuerySchema = z.object({
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional()
});

export const formulasAdminRouter = Router();

formulasAdminRouter.get("/content/formulas", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = formulaListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid formula query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const conditions: SQL[] = [];
  if (parsedQuery.data.subjectId) {
    conditions.push(eq(formulas.subjectId, parsedQuery.data.subjectId));
  }
  if (parsedQuery.data.chapterId) {
    conditions.push(eq(formulas.chapterId, parsedQuery.data.chapterId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const formulaRows = await db
    .select({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt,
      subjectName: subjects.name,
      chapterTitle: chapters.title
    })
    .from(formulas)
    .leftJoin(subjects, eq(formulas.subjectId, subjects.id))
    .leftJoin(chapters, eq(formulas.chapterId, chapters.id))
    .where(whereClause)
    .orderBy(desc(formulas.createdAt));

  res.status(200).json({
    data: formulaRows,
    total: formulaRows.length
  });
});

/**
 * POST /api/admin/content/formulas - Create a formula
 */
formulasAdminRouter.post("/content/formulas", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = formulaCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid formula payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  const insertedRows = await db
    .insert(formulas)
    .values({
      subjectId: parsedBody.data.subjectId,
      chapterId: parsedBody.data.chapterId,
      name: parsedBody.data.name.trim(),
      formulaLatex: parsedBody.data.formulaLatex.trim(),
      description: parsedBody.data.description.trim(),
      variables: parsedBody.data.variables,
      tags: parsedBody.data.tags
    })
    .returning({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt
    });

  const newFormula = insertedRows[0];
  if (!newFormula) {
    await persistAuditLog({
      scope: "content",
      action: "Create formula",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Formula creation failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create formula" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Create formula",
    target: `Formula #${newFormula.id}`,
    status: "success",
    message: `Created formula "${newFormula.name}" for subject ${newFormula.subjectId}`,
    actorId,
    actorName
  });

  res.status(201).json({
    data: newFormula
  });
});

/**
 * POST /api/admin/content/formulas/:id/update - Update a formula
 */
formulasAdminRouter.post("/content/formulas/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid formula identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = formulaUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid formula payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if formula exists
  const existingRows = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(eq(formulas.id, parsedParams.data.id))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    await persistAuditLog({
      scope: "content",
      action: "Update formula",
      target: `Formula #${parsedParams.data.id}`,
      status: "failed",
      message: "Formula not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Formula not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsedBody.data.subjectId !== undefined) updateData.subjectId = parsedBody.data.subjectId;
  if (parsedBody.data.chapterId !== undefined) updateData.chapterId = parsedBody.data.chapterId;
  if (parsedBody.data.name !== undefined) updateData.name = parsedBody.data.name.trim();
  if (parsedBody.data.formulaLatex !== undefined) updateData.formulaLatex = parsedBody.data.formulaLatex.trim();
  if (parsedBody.data.description !== undefined) updateData.description = parsedBody.data.description.trim();
  if (parsedBody.data.variables !== undefined) updateData.variables = parsedBody.data.variables;
  if (parsedBody.data.tags !== undefined) updateData.tags = parsedBody.data.tags;
  updateData.updatedAt = new Date();

  const updatedRows = await db
    .update(formulas)
    .set(updateData)
    .where(eq(formulas.id, existing.id))
    .returning({
      id: formulas.id,
      subjectId: formulas.subjectId,
      chapterId: formulas.chapterId,
      name: formulas.name,
      formulaLatex: formulas.formulaLatex,
      description: formulas.description,
      variables: formulas.variables,
      tags: formulas.tags,
      createdAt: formulas.createdAt,
      updatedAt: formulas.updatedAt
    });

  const updatedFormula = updatedRows[0];
  if (!updatedFormula) {
    await persistAuditLog({
      scope: "content",
      action: "Update formula",
      target: `Formula #${existing.id}`,
      status: "failed",
      message: "Formula update failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to update formula" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Update formula",
    target: `Formula #${updatedFormula.id}`,
    status: "success",
    message: `Updated formula "${updatedFormula.name}"`,
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedFormula
  });
});

/**
 * POST /api/admin/content/formulas/:id/delete - Delete a formula
 */
formulasAdminRouter.post("/content/formulas/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid formula identifier",
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

  const formulaRows = await db
    .select({
      id: formulas.id,
      name: formulas.name,
      subjectId: formulas.subjectId
    })
    .from(formulas)
    .where(eq(formulas.id, parsedParams.data.id))
    .limit(1);

  const formula = formulaRows[0];
  if (!formula) {
    await persistAuditLog({
      scope: "content",
      action: "Delete formula",
      target: `Formula #${parsedParams.data.id}`,
      status: "failed",
      message: "Formula not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Formula not found" });
    return;
  }

  await db.delete(formulas).where(eq(formulas.id, formula.id));

  await persistAuditLog({
    scope: "content",
    action: "Delete formula",
    target: `Formula #${formula.id} "${formula.name}"`,
    status: "success",
    message: `Deleted formula from subject ${formula.subjectId}`,
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: formula.id
  });
});
