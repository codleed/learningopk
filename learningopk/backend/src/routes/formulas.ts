import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { formulasRepository } from "../repositories/formulas.repository.js";

const numericStringSchema = z.coerce.number().int().positive();

export const formulasQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  subjectId: z.preprocess((value) => (value === undefined || value === "" ? undefined : value), numericStringSchema.optional()),
  chapterId: z.preprocess((value) => (value === undefined || value === "" ? undefined : value), numericStringSchema.optional()),
  tag: z.string().trim().max(50).optional().default("")
});

export const formulaIdParamSchema = z.object({
  formulaId: numericStringSchema
});

export const formulasRouter = Router();

formulasRouter.get("/", requireSession, async (req, res) => {
  const parsed = formulasQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid formulas query",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  const filters = {
    ...(parsed.data.q ? { q: parsed.data.q } : {}),
    ...(parsed.data.subjectId ? { subjectId: parsed.data.subjectId } : {}),
    ...(parsed.data.chapterId ? { chapterId: parsed.data.chapterId } : {}),
    ...(parsed.data.tag ? { tag: parsed.data.tag } : {})
  };

  try {
    const [items, filterOptions] = await Promise.all([
      formulasRepository.listFormulas(filters, userId),
      formulasRepository.listFilters()
    ]);

    res.status(200).json({
      items,
      filters: filterOptions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

formulasRouter.post("/:formulaId/star", requireSession, async (req, res) => {
  const params = formulaIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({
      error: "Invalid formula id",
      details: params.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const existingFormula = await formulasRepository.findFormulaById(params.data.formulaId);
    if (!existingFormula) {
      res.status(404).json({ error: "Formula not found" });
      return;
    }

    const result = await formulasRepository.toggleStar(authedReq.session.user.id, params.data.formulaId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

formulasRouter.post("/:formulaId/access", requireSession, async (req, res) => {
  const params = formulaIdParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({
      error: "Invalid formula id",
      details: params.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const existingFormula = await formulasRepository.findFormulaById(params.data.formulaId);
    if (!existingFormula) {
      res.status(404).json({ error: "Formula not found" });
      return;
    }

    await formulasRepository.recordAccess(authedReq.session.user.id, params.data.formulaId);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
