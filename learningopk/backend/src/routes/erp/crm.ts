import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { ERP_CONTACT_TYPES } from "@learningopk/shared";
import { db } from "../../lib/db/index.js";
import {
  erpContacts,
  erpDeals,
  erpPipelineStages,
  erpPipelines,
} from "../../lib/db/schema/erp/crm.js";
import { erpEmployees } from "../../lib/db/schema/erp/hrm.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { requireSession } from "../../lib/session.js";
import { escapeLikePattern } from "../../lib/escape-like.js";

export const erpCrmRouter = Router();

const contactTypes = ERP_CONTACT_TYPES as readonly string[];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const moneyInput = z
  .union([z.string(), z.number()])
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0)
  .transform((v) => String(v));

const contactBodySchema = z.object({
  contactType: z
    .string()
    .refine((v) => contactTypes.includes(v))
    .default("lead"),
  name: z.string().min(1).max(120),
  email: z.string().email().max(160).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  studentName: z.string().max(120).optional(),
  studentGrade: z.string().max(60).optional(),
  source: z.string().max(60).optional(),
  budget: moneyInput.optional(),
  notes: z.string().max(2000).optional(),
  ownerId: z.number().int().positive().optional(),
});

const contactUpdateSchema = z.object({
  contactType: z
    .string()
    .refine((v) => contactTypes.includes(v))
    .optional(),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(160).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  studentName: z.string().max(120).optional(),
  studentGrade: z.string().max(60).optional(),
  source: z.string().max(60).optional(),
  budget: moneyInput.optional(),
  notes: z.string().max(2000).optional(),
  ownerId: z.number().int().positive().optional(),
});

const pipelineBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  stages: z
    .array(z.string().min(1).max(60))
    .max(20)
    .refine((stages) => new Set(stages).size === stages.length, "Duplicate stage names"),
});

const pipelineUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const stageBodySchema = z.object({
  name: z.string().min(1).max(60),
  position: z.number().int().min(0).optional(),
});

const dealBodySchema = z.object({
  pipelineId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  title: z.string().min(1).max(160),
  value: moneyInput.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  closedAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  ownerId: z.number().int().positive().optional(),
});

const dealUpdateSchema = z.object({
  pipelineId: z.number().int().positive().optional(),
  stageId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  title: z.string().min(1).max(160).optional(),
  value: moneyInput.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  closedAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  ownerId: z.number().int().positive().optional(),
});

function parseIdParam(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function queryString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parsePagination(req: ErpRequest): { page: number; pageSize: number } {
  const rawPage = Number.parseInt(String(req.query.page ?? ""), 10);
  const rawPageSize = Number.parseInt(String(req.query.pageSize ?? ""), 10);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isSafeInteger(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

async function employeeExistsInSchool(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

async function contactExistsInSchool(schoolId: number, contactId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpContacts.id })
    .from(erpContacts)
    .where(and(eq(erpContacts.id, contactId), eq(erpContacts.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

// GET /api/erp/crm/contacts — paginated contact list with type/search filters
erpCrmRouter.get("/contacts", requireSession, erpGuard("CONTACTS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize } = parsePagination(erpReq);

  const contactType = queryString(erpReq.query.contactType);
  if (contactType !== null && !contactTypes.includes(contactType)) {
    res.status(400).json(errorResponse("Invalid contact type", "VALIDATION_ERROR"));
    return;
  }

  const search = queryString(erpReq.query.search);

  const conditions: SQL[] = [eq(erpContacts.schoolId, schoolId)];
  if (contactType !== null) conditions.push(eq(erpContacts.contactType, contactType));
  if (search !== null) {
    const safeSearch = escapeLikePattern(search);
    const pattern = `%${safeSearch}%`;
    const searchCondition = or(
      ilike(erpContacts.name, pattern),
      ilike(erpContacts.email, pattern),
      ilike(erpContacts.phone, pattern)
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const [totalRow] = await db
    .select({ value: count() })
    .from(erpContacts)
    .where(and(...conditions));

  const items = await db
    .select()
    .from(erpContacts)
    .where(and(...conditions))
    .orderBy(desc(erpContacts.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.status(200).json(successResponse({ items, total: totalRow?.value ?? 0, page, pageSize }));
});

// POST /api/erp/crm/contacts — create a lead/client/vendor contact
erpCrmRouter.post("/contacts", requireSession, erpGuard("CONTACTS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = contactBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid contact", "VALIDATION_ERROR"));
    return;
  }

  const {
    contactType,
    name,
    email,
    phone,
    address,
    studentName,
    studentGrade,
    source,
    budget,
    notes,
    ownerId,
  } = parsed.data;

  if (ownerId !== undefined && !(await employeeExistsInSchool(schoolId, ownerId))) {
    res
      .status(400)
      .json(errorResponse("Owner employee not found in this school", "OWNER_NOT_FOUND"));
    return;
  }

  const inserted = await db
    .insert(erpContacts)
    .values({
      schoolId,
      contactType,
      name,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      studentName: studentName ?? null,
      studentGrade: studentGrade ?? null,
      source: source ?? null,
      budget: budget ?? null,
      notes: notes ?? null,
      ownerId: ownerId ?? null,
      createdBy: erpReq.session.user.id,
    })
    .returning();

  res.status(201).json(successResponse({ contact: inserted[0] }));
});

// GET /api/erp/crm/contacts/:id — contact with owner name
erpCrmRouter.get("/contacts/:id", requireSession, erpGuard("CONTACTS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const contactId = parseIdParam(req.params.id);
  if (!contactId) {
    res.status(400).json(errorResponse("Invalid contact ID", "VALIDATION_ERROR"));
    return;
  }

  const rows = await db
    .select({
      contact: erpContacts,
      ownerFirstName: erpEmployees.firstName,
      ownerLastName: erpEmployees.lastName,
    })
    .from(erpContacts)
    .leftJoin(erpEmployees, eq(erpEmployees.id, erpContacts.ownerId))
    .where(and(eq(erpContacts.id, contactId), eq(erpContacts.schoolId, schoolId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    res.status(404).json(errorResponse("Contact not found", "CONTACT_NOT_FOUND"));
    return;
  }

  const ownerName =
    [row.ownerFirstName, row.ownerLastName]
      .filter((part): part is string => typeof part === "string")
      .join(" ") || null;

  res.status(200).json(successResponse({ contact: { ...row.contact, ownerName } }));
});

// PUT /api/erp/crm/contacts/:id — update contact fields
erpCrmRouter.put("/contacts/:id", requireSession, erpGuard("CONTACTS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const contactId = parseIdParam(req.params.id);
  if (!contactId) {
    res.status(400).json(errorResponse("Invalid contact ID", "VALIDATION_ERROR"));
    return;
  }

  const parsed = contactUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid contact update", "VALIDATION_ERROR"));
    return;
  }

  const {
    contactType,
    name,
    email,
    phone,
    address,
    studentName,
    studentGrade,
    source,
    budget,
    notes,
    ownerId,
  } = parsed.data;

  if (ownerId !== undefined && !(await employeeExistsInSchool(schoolId, ownerId))) {
    res
      .status(400)
      .json(errorResponse("Owner employee not found in this school", "OWNER_NOT_FOUND"));
    return;
  }

  const updates: Partial<typeof erpContacts.$inferInsert> = { updatedAt: new Date() };
  if (contactType !== undefined) updates.contactType = contactType;
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (studentName !== undefined) updates.studentName = studentName;
  if (studentGrade !== undefined) updates.studentGrade = studentGrade;
  if (source !== undefined) updates.source = source;
  if (budget !== undefined) updates.budget = budget;
  if (notes !== undefined) updates.notes = notes;
  if (ownerId !== undefined) updates.ownerId = ownerId;

  const updated = await db
    .update(erpContacts)
    .set(updates)
    .where(and(eq(erpContacts.id, contactId), eq(erpContacts.schoolId, schoolId)))
    .returning();

  if (updated.length === 0) {
    res.status(404).json(errorResponse("Contact not found", "CONTACT_NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse({ contact: updated[0] }));
});

// DELETE /api/erp/crm/contacts/:id
erpCrmRouter.delete(
  "/contacts/:id",
  requireSession,
  erpGuard("CONTACTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const contactId = parseIdParam(req.params.id);
    if (!contactId) {
      res.status(400).json(errorResponse("Invalid contact ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpContacts)
      .where(and(eq(erpContacts.id, contactId), eq(erpContacts.schoolId, schoolId)))
      .returning({ id: erpContacts.id });

    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Contact not found", "CONTACT_NOT_FOUND"));
      return;
    }

    res.status(200).json(successResponse({ deleted: true }));
  }
);

// GET /api/erp/crm/pipelines — pipelines with their stages in order
erpCrmRouter.get("/pipelines", requireSession, erpGuard("PIPELINES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const pipelineRows = await db
    .select()
    .from(erpPipelines)
    .where(eq(erpPipelines.schoolId, schoolId))
    .orderBy(erpPipelines.id);

  const stageRows =
    pipelineRows.length > 0
      ? await db
          .select()
          .from(erpPipelineStages)
          .where(
            and(
              eq(erpPipelineStages.schoolId, schoolId),
              inArray(
                erpPipelineStages.pipelineId,
                pipelineRows.map((p) => p.id)
              )
            )
          )
          .orderBy(erpPipelineStages.pipelineId, erpPipelineStages.position)
      : [];

  const pipelines = pipelineRows.map((pipeline) => ({
    ...pipeline,
    stages: stageRows.filter((stage) => stage.pipelineId === pipeline.id),
  }));

  res.status(200).json(successResponse({ pipelines }));
});

// POST /api/erp/crm/pipelines — create a pipeline with ordered stages
erpCrmRouter.post("/pipelines", requireSession, erpGuard("PIPELINES_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = pipelineBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid pipeline", "VALIDATION_ERROR"));
    return;
  }

  const { name, description, stages } = parsed.data;

  const existing = await db
    .select({ id: erpPipelines.id })
    .from(erpPipelines)
    .where(and(eq(erpPipelines.schoolId, schoolId), eq(erpPipelines.name, name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Pipeline name already exists", "PIPELINE_EXISTS"));
    return;
  }

  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(erpPipelines)
      .values({ schoolId, name, description: description ?? null })
      .returning();
    const pipeline = inserted[0]!;

    const stageRows =
      stages.length > 0
        ? await tx
            .insert(erpPipelineStages)
            .values(
              stages.map((stageName, index) => ({
                schoolId,
                pipelineId: pipeline.id,
                name: stageName,
                position: index,
              }))
            )
            .returning()
        : [];

    return { pipeline, stages: stageRows };
  });

  res.status(201).json(successResponse(result));
});

// POST /api/erp/crm/pipelines/:id/stages — add a stage to a pipeline
erpCrmRouter.post(
  "/pipelines/:id/stages",
  requireSession,
  erpGuard("PIPELINES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const pipelineId = parseIdParam(req.params.id);
    if (!pipelineId) {
      res.status(400).json(errorResponse("Invalid pipeline ID", "VALIDATION_ERROR"));
      return;
    }

    const pipelineRows = await db
      .select({ id: erpPipelines.id })
      .from(erpPipelines)
      .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
      .limit(1);
    if (!pipelineRows[0]) {
      res.status(404).json(errorResponse("Pipeline not found", "PIPELINE_NOT_FOUND"));
      return;
    }

    const parsed = stageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid stage", "VALIDATION_ERROR"));
      return;
    }

    const { name, position } = parsed.data;

    const existingStage = await db
      .select({ id: erpPipelineStages.id })
      .from(erpPipelineStages)
      .where(and(eq(erpPipelineStages.pipelineId, pipelineId), eq(erpPipelineStages.name, name)))
      .limit(1);
    if (existingStage[0]) {
      res
        .status(409)
        .json(errorResponse("Stage name already exists in this pipeline", "STAGE_EXISTS"));
      return;
    }

    let stagePosition = position;
    if (stagePosition === undefined) {
      const [maxRow] = await db
        .select({ maxPos: sql<number | null>`max(${erpPipelineStages.position})` })
        .from(erpPipelineStages)
        .where(eq(erpPipelineStages.pipelineId, pipelineId));
      stagePosition = (maxRow?.maxPos ?? -1) + 1;
    }

    const inserted = await db
      .insert(erpPipelineStages)
      .values({ schoolId, pipelineId, name, position: stagePosition })
      .returning();

    res.status(201).json(successResponse({ stage: inserted[0] }));
  }
);

// DELETE /api/erp/crm/pipelines/stages/:id — remove a stage
erpCrmRouter.delete(
  "/pipelines/stages/:id",
  requireSession,
  erpGuard("PIPELINES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const stageId = parseIdParam(req.params.id);
    if (!stageId) {
      res.status(400).json(errorResponse("Invalid stage ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpPipelineStages)
      .where(and(eq(erpPipelineStages.id, stageId), eq(erpPipelineStages.schoolId, schoolId)))
      .returning({ id: erpPipelineStages.id });

    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Stage not found", "STAGE_NOT_FOUND"));
      return;
    }

    res.status(200).json(successResponse({ deleted: true }));
  }
);

// PUT /api/erp/crm/pipelines/:id — update pipeline name/description/isActive
erpCrmRouter.put(
  "/pipelines/:id",
  requireSession,
  erpGuard("PIPELINES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const pipelineId = parseIdParam(req.params.id);
    if (!pipelineId) {
      res.status(400).json(errorResponse("Invalid pipeline ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = pipelineUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid pipeline update", "VALIDATION_ERROR"));
      return;
    }

    const existingRows = await db
      .select()
      .from(erpPipelines)
      .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
      .limit(1);
    const pipeline = existingRows[0];
    if (!pipeline) {
      res.status(404).json(errorResponse("Pipeline not found", "PIPELINE_NOT_FOUND"));
      return;
    }

    const { name, description, isActive } = parsed.data;

    if (name !== undefined && name !== pipeline.name) {
      const conflict = await db
        .select({ id: erpPipelines.id })
        .from(erpPipelines)
        .where(and(eq(erpPipelines.schoolId, schoolId), eq(erpPipelines.name, name)))
        .limit(1);
      if (conflict[0]) {
        res.status(409).json(errorResponse("Pipeline name already exists", "PIPELINE_EXISTS"));
        return;
      }
    }

    const updates: Partial<typeof erpPipelines.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      res.status(200).json(successResponse({ pipeline }));
      return;
    }

    const updated = await db
      .update(erpPipelines)
      .set(updates)
      .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
      .returning();

    res.status(200).json(successResponse({ pipeline: updated[0] }));
  }
);

// DELETE /api/erp/crm/pipelines/:id
erpCrmRouter.delete(
  "/pipelines/:id",
  requireSession,
  erpGuard("PIPELINES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const pipelineId = parseIdParam(req.params.id);
    if (!pipelineId) {
      res.status(400).json(errorResponse("Invalid pipeline ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpPipelines)
      .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
      .returning({ id: erpPipelines.id });

    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Pipeline not found", "PIPELINE_NOT_FOUND"));
      return;
    }

    res.status(200).json(successResponse({ deleted: true }));
  }
);

// GET /api/erp/crm/deals — paginated deals with stage/contact names
erpCrmRouter.get("/deals", requireSession, erpGuard("DEALS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize } = parsePagination(erpReq);

  const rawPipelineId = queryString(erpReq.query.pipelineId);
  let pipelineId: number | undefined;
  if (rawPipelineId !== null) {
    const parsedPipelineId = Number.parseInt(rawPipelineId, 10);
    if (!Number.isSafeInteger(parsedPipelineId) || parsedPipelineId <= 0) {
      res.status(400).json(errorResponse("Invalid pipeline ID", "VALIDATION_ERROR"));
      return;
    }
    pipelineId = parsedPipelineId;
  }

  const rawStageId = queryString(erpReq.query.stageId);
  let stageId: number | undefined;
  if (rawStageId !== null) {
    const parsedStageId = Number.parseInt(rawStageId, 10);
    if (!Number.isSafeInteger(parsedStageId) || parsedStageId <= 0) {
      res.status(400).json(errorResponse("Invalid stage ID", "VALIDATION_ERROR"));
      return;
    }
    stageId = parsedStageId;
  }

  const search = queryString(erpReq.query.search);

  const conditions: SQL[] = [eq(erpDeals.schoolId, schoolId)];
  if (pipelineId !== undefined) conditions.push(eq(erpDeals.pipelineId, pipelineId));
  if (stageId !== undefined) conditions.push(eq(erpDeals.stageId, stageId));
  if (search !== null) {
    const safeSearch = escapeLikePattern(search);
    const pattern = `%${safeSearch}%`;
    const searchCondition = or(ilike(erpDeals.title, pattern), ilike(erpContacts.name, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }

  const joins = {
    stages: eq(erpPipelineStages.id, erpDeals.stageId),
    contacts: eq(erpContacts.id, erpDeals.contactId),
  };

  const [totalRow] = await db
    .select({ value: count() })
    .from(erpDeals)
    .innerJoin(erpPipelineStages, joins.stages)
    .leftJoin(erpContacts, joins.contacts)
    .where(and(...conditions));

  const items = await db
    .select({
      id: erpDeals.id,
      pipelineId: erpDeals.pipelineId,
      stageId: erpDeals.stageId,
      stageName: erpPipelineStages.name,
      stagePosition: erpPipelineStages.position,
      contactId: erpDeals.contactId,
      contactName: erpContacts.name,
      title: erpDeals.title,
      value: erpDeals.value,
      probability: erpDeals.probability,
      expectedCloseDate: erpDeals.expectedCloseDate,
      closedAt: erpDeals.closedAt,
      notes: erpDeals.notes,
      ownerId: erpDeals.ownerId,
      createdAt: erpDeals.createdAt,
      updatedAt: erpDeals.updatedAt,
    })
    .from(erpDeals)
    .innerJoin(erpPipelineStages, joins.stages)
    .leftJoin(erpContacts, joins.contacts)
    .where(and(...conditions))
    .orderBy(desc(erpDeals.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.status(200).json(successResponse({ items, total: totalRow?.value ?? 0, page, pageSize }));
});

// POST /api/erp/crm/deals — create a deal in a pipeline stage
erpCrmRouter.post("/deals", requireSession, erpGuard("DEALS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const parsed = dealBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid deal", "VALIDATION_ERROR"));
    return;
  }

  const {
    pipelineId,
    stageId,
    contactId,
    title,
    value,
    probability,
    expectedCloseDate,
    closedAt,
    notes,
    ownerId,
  } = parsed.data;

  const pipelineRows = await db
    .select({ id: erpPipelines.id })
    .from(erpPipelines)
    .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
    .limit(1);
  if (!pipelineRows[0]) {
    res.status(400).json(errorResponse("Pipeline not found in this school", "PIPELINE_NOT_FOUND"));
    return;
  }

  const stageRows = await db
    .select({ id: erpPipelineStages.id })
    .from(erpPipelineStages)
    .where(
      and(
        eq(erpPipelineStages.id, stageId),
        eq(erpPipelineStages.pipelineId, pipelineId),
        eq(erpPipelineStages.schoolId, schoolId)
      )
    )
    .limit(1);
  if (!stageRows[0]) {
    res.status(400).json(errorResponse("Stage does not belong to this pipeline", "STAGE_MISMATCH"));
    return;
  }

  if (contactId !== undefined && !(await contactExistsInSchool(schoolId, contactId))) {
    res.status(400).json(errorResponse("Contact not found in this school", "CONTACT_NOT_FOUND"));
    return;
  }

  if (ownerId !== undefined && !(await employeeExistsInSchool(schoolId, ownerId))) {
    res
      .status(400)
      .json(errorResponse("Owner employee not found in this school", "OWNER_NOT_FOUND"));
    return;
  }

  const inserted = await db
    .insert(erpDeals)
    .values({
      schoolId,
      pipelineId,
      stageId,
      contactId: contactId ?? null,
      title,
      value: value ?? "0",
      probability: probability ?? 0,
      expectedCloseDate: expectedCloseDate ?? null,
      closedAt: closedAt ?? null,
      notes: notes ?? null,
      ownerId: ownerId ?? null,
      createdBy: erpReq.session.user.id,
    })
    .returning();

  res.status(201).json(successResponse({ deal: inserted[0] }));
});

// PUT /api/erp/crm/deals/:id — update a deal (including stage moves)
erpCrmRouter.put("/deals/:id", requireSession, erpGuard("DEALS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const dealId = parseIdParam(req.params.id);
  if (!dealId) {
    res.status(400).json(errorResponse("Invalid deal ID", "VALIDATION_ERROR"));
    return;
  }

  const parsed = dealUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid deal update", "VALIDATION_ERROR"));
    return;
  }

  const existingRows = await db
    .select()
    .from(erpDeals)
    .where(and(eq(erpDeals.id, dealId), eq(erpDeals.schoolId, schoolId)))
    .limit(1);
  const deal = existingRows[0];
  if (!deal) {
    res.status(404).json(errorResponse("Deal not found", "DEAL_NOT_FOUND"));
    return;
  }

  const {
    pipelineId,
    stageId,
    contactId,
    title,
    value,
    probability,
    expectedCloseDate,
    closedAt,
    notes,
    ownerId,
  } = parsed.data;

  if (pipelineId !== undefined) {
    const pipelineRows = await db
      .select({ id: erpPipelines.id })
      .from(erpPipelines)
      .where(and(eq(erpPipelines.id, pipelineId), eq(erpPipelines.schoolId, schoolId)))
      .limit(1);
    if (!pipelineRows[0]) {
      res
        .status(400)
        .json(errorResponse("Pipeline not found in this school", "PIPELINE_NOT_FOUND"));
      return;
    }
  }

  const targetPipelineId = pipelineId ?? deal.pipelineId;

  if (stageId !== undefined) {
    const stageRows = await db
      .select({ id: erpPipelineStages.id })
      .from(erpPipelineStages)
      .where(
        and(
          eq(erpPipelineStages.id, stageId),
          eq(erpPipelineStages.pipelineId, targetPipelineId),
          eq(erpPipelineStages.schoolId, schoolId)
        )
      )
      .limit(1);
    if (!stageRows[0]) {
      res
        .status(400)
        .json(errorResponse("Stage does not belong to this pipeline", "STAGE_MISMATCH"));
      return;
    }
  } else if (pipelineId !== undefined && pipelineId !== deal.pipelineId) {
    res
      .status(400)
      .json(
        errorResponse(
          "stageId is required when moving a deal to another pipeline",
          "VALIDATION_ERROR"
        )
      );
    return;
  }

  if (contactId !== undefined && !(await contactExistsInSchool(schoolId, contactId))) {
    res.status(400).json(errorResponse("Contact not found in this school", "CONTACT_NOT_FOUND"));
    return;
  }

  if (ownerId !== undefined && !(await employeeExistsInSchool(schoolId, ownerId))) {
    res
      .status(400)
      .json(errorResponse("Owner employee not found in this school", "OWNER_NOT_FOUND"));
    return;
  }

  const updates: Partial<typeof erpDeals.$inferInsert> = { updatedAt: new Date() };
  if (pipelineId !== undefined) updates.pipelineId = pipelineId;
  if (stageId !== undefined) updates.stageId = stageId;
  if (contactId !== undefined) updates.contactId = contactId;
  if (title !== undefined) updates.title = title;
  if (value !== undefined) updates.value = value;
  if (probability !== undefined) updates.probability = probability;
  if (expectedCloseDate !== undefined) updates.expectedCloseDate = expectedCloseDate;
  if (closedAt !== undefined) updates.closedAt = closedAt;
  if (notes !== undefined) updates.notes = notes;
  if (ownerId !== undefined) updates.ownerId = ownerId;

  const updated = await db
    .update(erpDeals)
    .set(updates)
    .where(and(eq(erpDeals.id, dealId), eq(erpDeals.schoolId, schoolId)))
    .returning();

  res.status(200).json(successResponse({ deal: updated[0] }));
});

// DELETE /api/erp/crm/deals/:id
erpCrmRouter.delete("/deals/:id", requireSession, erpGuard("DEALS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const dealId = parseIdParam(req.params.id);
  if (!dealId) {
    res.status(400).json(errorResponse("Invalid deal ID", "VALIDATION_ERROR"));
    return;
  }

  const deleted = await db
    .delete(erpDeals)
    .where(and(eq(erpDeals.id, dealId), eq(erpDeals.schoolId, schoolId)))
    .returning({ id: erpDeals.id });

  if (deleted.length === 0) {
    res.status(404).json(errorResponse("Deal not found", "DEAL_NOT_FOUND"));
    return;
  }

  res.status(200).json(successResponse({ deleted: true }));
});

// GET /api/erp/crm/stats — admissions funnel: deal count + value by stage
erpCrmRouter.get("/stats", requireSession, erpGuard("DEALS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const rawPipelineId = queryString(erpReq.query.pipelineId);
  let pipelineId: number | null = null;

  if (rawPipelineId !== null) {
    const parsedPipelineId = Number.parseInt(rawPipelineId, 10);
    if (!Number.isSafeInteger(parsedPipelineId) || parsedPipelineId <= 0) {
      res.status(400).json(errorResponse("Invalid pipeline ID", "VALIDATION_ERROR"));
      return;
    }
    const pipelineRows = await db
      .select({ id: erpPipelines.id })
      .from(erpPipelines)
      .where(and(eq(erpPipelines.id, parsedPipelineId), eq(erpPipelines.schoolId, schoolId)))
      .limit(1);
    if (!pipelineRows[0]) {
      res.status(404).json(errorResponse("Pipeline not found", "PIPELINE_NOT_FOUND"));
      return;
    }
    pipelineId = parsedPipelineId;
  } else {
    const activePipelineRows = await db
      .select({ id: erpPipelines.id })
      .from(erpPipelines)
      .where(and(eq(erpPipelines.schoolId, schoolId), eq(erpPipelines.isActive, true)))
      .orderBy(erpPipelines.id)
      .limit(1);
    pipelineId = activePipelineRows[0]?.id ?? null;
  }

  if (pipelineId === null) {
    res.status(200).json(
      successResponse({
        pipelineId: null,
        stages: [],
        totals: { dealCount: 0, totalValue: 0 },
      })
    );
    return;
  }

  const stageRows = await db
    .select({
      stageId: erpPipelineStages.id,
      stageName: erpPipelineStages.name,
      position: erpPipelineStages.position,
      dealCount: count(erpDeals.id),
      totalValue: sql<string | null>`coalesce(sum(${erpDeals.value}), 0)`,
    })
    .from(erpPipelineStages)
    .leftJoin(
      erpDeals,
      and(eq(erpDeals.stageId, erpPipelineStages.id), eq(erpDeals.schoolId, schoolId))
    )
    .where(
      and(eq(erpPipelineStages.schoolId, schoolId), eq(erpPipelineStages.pipelineId, pipelineId))
    )
    .groupBy(erpPipelineStages.id, erpPipelineStages.name, erpPipelineStages.position)
    .orderBy(erpPipelineStages.position);

  const stages = stageRows.map((row) => ({
    stageId: row.stageId,
    stageName: row.stageName,
    position: row.position,
    dealCount: row.dealCount,
    totalValue: row.totalValue ?? "0",
  }));

  const totalDealCount = stages.reduce((acc, stage) => acc + stage.dealCount, 0);
  const totalValueSum = stages.reduce((acc, stage) => acc + Number(stage.totalValue), 0);
  const totalValue = (Math.round(totalValueSum * 100) / 100).toFixed(2);

  res
    .status(200)
    .json(
      successResponse({ pipelineId, stages, totals: { dealCount: totalDealCount, totalValue } })
    );
});
