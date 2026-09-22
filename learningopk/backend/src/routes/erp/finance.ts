import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { ERP_INVOICE_STATUSES, ERP_PAYMENT_METHODS } from "@learningopk/shared";

import { db } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import { erpEnrollments, erpSchoolClasses } from "../../lib/db/schema/erp/academics.js";
import {
  erpFeeComponents,
  erpFeeStructures,
  erpInvoiceItems,
  erpInvoices,
  erpPayments,
} from "../../lib/db/schema/erp/finance.js";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { escapeLikePattern } from "../../lib/escape-like.js";
import { erpGuard, parseSchoolId, requireErpAccess, type ErpRequest } from "../../lib/erp/acl.js";

export const erpFinanceRouter = Router();

const INVOICE_STATUSES = ERP_INVOICE_STATUSES as readonly string[];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstQueryValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

function parseIdParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePagination(req: ErpRequest): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const pageValue = Number.parseInt(firstQueryValue(req.query.page) ?? "1", 10);
  const pageSizeValue = Number.parseInt(firstQueryValue(req.query.pageSize) ?? "20", 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize =
    Number.isSafeInteger(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, 100) : 20;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseDateBoundary(value: string, time: string): Date | null {
  if (!isValidDateString(value)) return null;
  const parsed = new Date(`${value}T${time}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const toCents = (value: number): number => Math.round(value * 100);
const fromCents = (cents: number): string => (cents / 100).toFixed(2);
const toNumber = (value: string | number | null): number =>
  value === null ? 0 : typeof value === "number" ? value : Number.parseFloat(value) || 0;

function pgErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  if ("code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  if ("cause" in error) {
    return pgErrorCode((error as { cause?: unknown }).cause);
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

const feeComponentBodySchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().min(0),
  isOptional: z.boolean().optional(),
});

const feeStructureCreateSchema = z.object({
  name: z.string().min(1).max(160),
  classLevel: z.string().max(60).optional(),
  components: z.array(feeComponentBodySchema).min(1).max(100),
});

const feeStructureUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  classLevel: z.string().max(60).nullable().optional(),
  components: z.array(feeComponentBodySchema).min(1).max(100).optional(),
});

const invoiceItemBodySchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
});

const invoiceCreateSchema = z.object({
  studentUserId: z.string().min(1).optional(),
  feeStructureId: z.number().int().positive().optional(),
  issueDate: z.string().refine(isValidDateString),
  dueDate: z.string().refine(isValidDateString).optional(),
  items: z.array(invoiceItemBodySchema).min(1).max(200),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

const invoiceStatusUpdateSchema = z.object({
  status: z.enum(ERP_INVOICE_STATUSES),
});

const paymentCreateSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(ERP_PAYMENT_METHODS),
  reference: z.string().max(200).optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

const generateFromStructureSchema = z.object({
  feeStructureId: z.number().int().positive(),
  classId: z.number().int().positive().optional(),
  studentUserIds: z.array(z.string().min(1)).max(500).optional(),
});

// GET /fee-structures — paginated fee structures with nested components
erpFinanceRouter.get("/fee-structures", requireSession, erpGuard("FEES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePagination(erpReq);

  const rows = await db
    .select()
    .from(erpFeeStructures)
    .where(eq(erpFeeStructures.schoolId, schoolId))
    .orderBy(desc(erpFeeStructures.createdAt), desc(erpFeeStructures.id))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ value: count() })
    .from(erpFeeStructures)
    .where(eq(erpFeeStructures.schoolId, schoolId));

  const structureIds = rows.map((row) => row.id);
  const componentRows =
    structureIds.length > 0
      ? await db
          .select()
          .from(erpFeeComponents)
          .where(
            and(
              eq(erpFeeComponents.schoolId, schoolId),
              inArray(erpFeeComponents.feeStructureId, structureIds)
            )
          )
          .orderBy(asc(erpFeeComponents.position), asc(erpFeeComponents.id))
      : [];

  const items = rows.map((row) => ({
    ...row,
    components: componentRows.filter((component) => component.feeStructureId === row.id),
  }));

  res.status(200).json(successResponse({ items, total: totalRow?.value ?? 0, page, pageSize }));
});

// POST /fee-structures — create with components; totalAmount = sum of amounts
erpFinanceRouter.post(
  "/fee-structures",
  requireSession,
  erpGuard("FEES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const parsed = feeStructureCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid fee structure", "VALIDATION_ERROR"));
      return;
    }
    const { name, classLevel, components } = parsed.data;

    const existing = await db
      .select({ id: erpFeeStructures.id })
      .from(erpFeeStructures)
      .where(and(eq(erpFeeStructures.schoolId, schoolId), eq(erpFeeStructures.name, name)))
      .limit(1);
    if (existing[0]) {
      res
        .status(409)
        .json(errorResponse("Fee structure name already exists", "FEE_STRUCTURE_EXISTS"));
      return;
    }

    const totalCents = components.reduce((sum, component) => sum + toCents(component.amount), 0);

    const created = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(erpFeeStructures)
        .values({
          schoolId,
          name,
          classLevel: classLevel ?? null,
          totalAmount: fromCents(totalCents),
        })
        .returning();
      const structure = inserted[0];
      if (!structure) throw new Error("Fee structure insert returned no row");
      await tx.insert(erpFeeComponents).values(
        components.map((component, index) => ({
          schoolId,
          feeStructureId: structure.id,
          name: component.name,
          amount: component.amount.toFixed(2),
          isOptional: component.isOptional ?? false,
          position: index,
        }))
      );
      return structure;
    });

    const componentRows = await db
      .select()
      .from(erpFeeComponents)
      .where(eq(erpFeeComponents.feeStructureId, created.id))
      .orderBy(asc(erpFeeComponents.position), asc(erpFeeComponents.id));

    res
      .status(201)
      .json(successResponse({ feeStructure: { ...created, components: componentRows } }));
  }
);

// PUT /fee-structures/:id — update fields and/or replace components
erpFinanceRouter.put(
  "/fee-structures/:id",
  requireSession,
  erpGuard("FEES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const structureId = parseIdParam(req.params.id);
    if (!structureId) {
      res.status(400).json(errorResponse("Invalid fee structure ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = feeStructureUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid fee structure update", "VALIDATION_ERROR"));
      return;
    }
    const { name, classLevel, components } = parsed.data;

    const structureRows = await db
      .select()
      .from(erpFeeStructures)
      .where(and(eq(erpFeeStructures.id, structureId), eq(erpFeeStructures.schoolId, schoolId)))
      .limit(1);
    const structure = structureRows[0];
    if (!structure) {
      res.status(404).json(errorResponse("Fee structure not found", "FEE_STRUCTURE_NOT_FOUND"));
      return;
    }

    if (name !== undefined && name !== structure.name) {
      const clash = await db
        .select({ id: erpFeeStructures.id })
        .from(erpFeeStructures)
        .where(and(eq(erpFeeStructures.schoolId, schoolId), eq(erpFeeStructures.name, name)))
        .limit(1);
      if (clash[0]) {
        res
          .status(409)
          .json(errorResponse("Fee structure name already exists", "FEE_STRUCTURE_EXISTS"));
        return;
      }
    }

    const totalCents =
      components !== undefined
        ? components.reduce((sum, component) => sum + toCents(component.amount), 0)
        : null;

    await db.transaction(async (tx) => {
      await tx
        .update(erpFeeStructures)
        .set({
          ...(name !== undefined ? { name } : {}),
          ...(classLevel !== undefined ? { classLevel } : {}),
          ...(totalCents !== null ? { totalAmount: fromCents(totalCents) } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(erpFeeStructures.id, structureId), eq(erpFeeStructures.schoolId, schoolId)));

      if (components !== undefined) {
        await tx.delete(erpFeeComponents).where(eq(erpFeeComponents.feeStructureId, structureId));
        if (components.length > 0) {
          await tx.insert(erpFeeComponents).values(
            components.map((component, index) => ({
              schoolId,
              feeStructureId: structureId,
              name: component.name,
              amount: component.amount.toFixed(2),
              isOptional: component.isOptional ?? false,
              position: index,
            }))
          );
        }
      }
    });

    res.status(200).json(successResponse({ updated: true }));
  }
);

// DELETE /fee-structures/:id
erpFinanceRouter.delete(
  "/fee-structures/:id",
  requireSession,
  erpGuard("FEES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const structureId = parseIdParam(req.params.id);
    if (!structureId) {
      res.status(400).json(errorResponse("Invalid fee structure ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpFeeStructures)
      .where(and(eq(erpFeeStructures.id, structureId), eq(erpFeeStructures.schoolId, schoolId)))
      .returning({ id: erpFeeStructures.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Fee structure not found", "FEE_STRUCTURE_NOT_FOUND"));
      return;
    }

    res.status(200).json(successResponse({ deleted: true }));
  }
);

// GET /invoices — paginated with student name and item counts
erpFinanceRouter.get("/invoices", requireSession, erpGuard("INVOICES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePagination(erpReq);

  const conditions = [eq(erpInvoices.schoolId, schoolId)];

  const status = firstQueryValue(req.query.status);
  if (status !== null) {
    if (!INVOICE_STATUSES.includes(status)) {
      res.status(400).json(errorResponse("Invalid invoice status filter", "VALIDATION_ERROR"));
      return;
    }
    conditions.push(eq(erpInvoices.status, status));
  }

  const studentUserId = firstQueryValue(req.query.studentUserId);
  if (studentUserId !== null) {
    conditions.push(eq(erpInvoices.studentUserId, studentUserId));
  }

  const search = firstQueryValue(req.query.search);
  if (search !== null && search !== "") {
    conditions.push(ilike(erpInvoices.invoiceNumber, `%${escapeLikePattern(search)}%`));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      ...getTableColumns(erpInvoices),
      studentName: users.name,
      itemsCount: sql<number>`(select count(*)::int from ${erpInvoiceItems} where ${erpInvoiceItems.invoiceId} = ${erpInvoices.id})`,
    })
    .from(erpInvoices)
    .leftJoin(users, eq(users.id, erpInvoices.studentUserId))
    .where(where)
    .orderBy(desc(erpInvoices.createdAt), desc(erpInvoices.id))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db.select({ value: count() }).from(erpInvoices).where(where);

  res
    .status(200)
    .json(successResponse({ items: rows, total: totalRow?.value ?? 0, page, pageSize }));
});

// POST /invoices/generate-from-structure — bulk invoice students from a fee structure
erpFinanceRouter.post(
  "/invoices/generate-from-structure",
  requireSession,
  erpGuard("INVOICES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const userId = erpReq.session.user.id;

    const parsed = generateFromStructureSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid bulk invoice request", "VALIDATION_ERROR"));
      return;
    }
    const { feeStructureId, classId, studentUserIds } = parsed.data;

    const structureRows = await db
      .select()
      .from(erpFeeStructures)
      .where(and(eq(erpFeeStructures.id, feeStructureId), eq(erpFeeStructures.schoolId, schoolId)))
      .limit(1);
    const structure = structureRows[0];
    if (!structure) {
      res.status(404).json(errorResponse("Fee structure not found", "FEE_STRUCTURE_NOT_FOUND"));
      return;
    }

    const componentRows = await db
      .select()
      .from(erpFeeComponents)
      .where(
        and(
          eq(erpFeeComponents.schoolId, schoolId),
          eq(erpFeeComponents.feeStructureId, feeStructureId)
        )
      )
      .orderBy(asc(erpFeeComponents.position), asc(erpFeeComponents.id));

    let targets: string[] = [];
    if (studentUserIds !== undefined && studentUserIds.length > 0) {
      const uniqueIds = Array.from(new Set(studentUserIds));
      const foundUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, uniqueIds));
      if (foundUsers.length !== uniqueIds.length) {
        res.status(400).json(errorResponse("Some students were not found", "STUDENT_NOT_FOUND"));
        return;
      }
      targets = uniqueIds;
    } else if (classId !== undefined) {
      const classRows = await db
        .select({ id: erpSchoolClasses.id })
        .from(erpSchoolClasses)
        .where(and(eq(erpSchoolClasses.id, classId), eq(erpSchoolClasses.schoolId, schoolId)))
        .limit(1);
      if (!classRows[0]) {
        res.status(404).json(errorResponse("Class not found", "CLASS_NOT_FOUND"));
        return;
      }
      const enrollmentRows = await db
        .select({ studentUserId: erpEnrollments.studentUserId })
        .from(erpEnrollments)
        .where(
          and(
            eq(erpEnrollments.schoolId, schoolId),
            eq(erpEnrollments.classId, classId),
            eq(erpEnrollments.status, "active")
          )
        );
      targets = Array.from(new Set(enrollmentRows.map((row) => row.studentUserId)));
    } else {
      res
        .status(400)
        .json(errorResponse("studentUserIds or classId is required", "VALIDATION_ERROR"));
      return;
    }

    if (targets.length === 0) {
      res.status(200).json(successResponse({ created: 0, skipped: 0, invoiceIds: [] }));
      return;
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const year = issueDate.slice(0, 4);

    let result: { created: number; skipped: number; invoiceIds: number[] } | null = null;
    let attempt = 0;
    while (result === null && attempt < 5) {
      attempt += 1;
      try {
        result = await db.transaction(async (tx) => {
          const existingRows = await tx
            .select({ studentUserId: erpInvoices.studentUserId })
            .from(erpInvoices)
            .where(
              and(
                eq(erpInvoices.schoolId, schoolId),
                eq(erpInvoices.feeStructureId, feeStructureId),
                ne(erpInvoices.status, "void"),
                inArray(erpInvoices.studentUserId, targets)
              )
            );
          const skipSet = new Set(
            existingRows.map((row) => row.studentUserId).filter((id): id is string => id !== null)
          );
          const toInvoice = targets.filter((id) => !skipSet.has(id));

          if (toInvoice.length === 0) {
            return { created: 0, skipped: targets.length, invoiceIds: [] as number[] };
          }

          const [countRow] = await tx
            .select({ value: count() })
            .from(erpInvoices)
            .where(eq(erpInvoices.schoolId, schoolId));
          const baseCount = countRow?.value ?? 0;

          const inserted = await tx
            .insert(erpInvoices)
            .values(
              toInvoice.map((studentUserId, index) => ({
                schoolId,
                invoiceNumber: `INV-${year}-${String(baseCount + 1 + index).padStart(4, "0")}`,
                studentUserId,
                feeStructureId,
                status: "draft",
                issueDate,
                dueDate: null,
                currency: structure.currency,
                subtotal: structure.totalAmount,
                discount: "0.00",
                tax: "0.00",
                total: structure.totalAmount,
                amountPaid: "0.00",
                createdBy: userId,
              }))
            )
            .returning({ id: erpInvoices.id });

          const invoiceIds = inserted.map((invoice) => invoice.id);

          const itemValues = invoiceIds.flatMap((invoiceId) =>
            componentRows.map((component, index) => ({
              schoolId,
              invoiceId,
              description: component.name,
              quantity: "1.00",
              unitPrice: component.amount,
              total: component.amount,
              position: index,
            }))
          );
          if (itemValues.length > 0) {
            await tx.insert(erpInvoiceItems).values(itemValues);
          }

          return {
            created: invoiceIds.length,
            skipped: targets.length - invoiceIds.length,
            invoiceIds,
          };
        });
      } catch (error) {
        if (!isUniqueViolation(error) || attempt >= 5) throw error;
      }
    }

    if (!result) {
      res.status(500).json(errorResponse("Failed to allocate invoice numbers", "INTERNAL_ERROR"));
      return;
    }

    res.status(result.created > 0 ? 201 : 200).json(successResponse(result));
  }
);

// GET /invoices/:id — single invoice with items
erpFinanceRouter.get(
  "/invoices/:id",
  requireSession,
  erpGuard("INVOICES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const invoiceId = parseIdParam(req.params.id);
    if (!invoiceId) {
      res.status(400).json(errorResponse("Invalid invoice ID", "VALIDATION_ERROR"));
      return;
    }

    const rows = await db
      .select({
        ...getTableColumns(erpInvoices),
        studentName: users.name,
      })
      .from(erpInvoices)
      .leftJoin(users, eq(users.id, erpInvoices.studentUserId))
      .where(and(eq(erpInvoices.id, invoiceId), eq(erpInvoices.schoolId, schoolId)))
      .limit(1);
    const invoice = rows[0];
    if (!invoice) {
      res.status(404).json(errorResponse("Invoice not found", "INVOICE_NOT_FOUND"));
      return;
    }

    const items = await db
      .select()
      .from(erpInvoiceItems)
      .where(and(eq(erpInvoiceItems.invoiceId, invoiceId), eq(erpInvoiceItems.schoolId, schoolId)))
      .orderBy(asc(erpInvoiceItems.position), asc(erpInvoiceItems.id));

    res.status(200).json(successResponse({ invoice: { ...invoice, items } }));
  }
);

// POST /invoices — create with line items and computed totals
erpFinanceRouter.post(
  "/invoices",
  requireSession,
  erpGuard("INVOICES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const userId = erpReq.session.user.id;

    const parsed = invoiceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid invoice", "VALIDATION_ERROR"));
      return;
    }
    const { studentUserId, feeStructureId, issueDate, dueDate, items, discount, tax, notes } =
      parsed.data;

    if (studentUserId !== undefined) {
      const studentRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, studentUserId))
        .limit(1);
      if (!studentRows[0]) {
        res.status(400).json(errorResponse("Student not found", "STUDENT_NOT_FOUND"));
        return;
      }
    }

    if (feeStructureId !== undefined) {
      const structureRows = await db
        .select({ id: erpFeeStructures.id })
        .from(erpFeeStructures)
        .where(
          and(eq(erpFeeStructures.id, feeStructureId), eq(erpFeeStructures.schoolId, schoolId))
        )
        .limit(1);
      if (!structureRows[0]) {
        res.status(404).json(errorResponse("Fee structure not found", "FEE_STRUCTURE_NOT_FOUND"));
        return;
      }
    }

    const subtotalCents = items.reduce(
      (sum, item) => sum + toCents(item.quantity * item.unitPrice),
      0
    );
    const discountCents = toCents(discount ?? 0);
    const taxCents = toCents(tax ?? 0);
    const totalCents = subtotalCents - discountCents + taxCents;
    const year = issueDate.slice(0, 4);

    let createdInvoice: typeof erpInvoices.$inferSelect | undefined;
    try {
      let attempt = 0;
      while (attempt < 5) {
        attempt += 1;
        try {
          createdInvoice = await db.transaction(async (tx) => {
            const [countRow] = await tx
              .select({ value: count() })
              .from(erpInvoices)
              .where(eq(erpInvoices.schoolId, schoolId));
            const invoiceNumber = `INV-${year}-${String((countRow?.value ?? 0) + 1).padStart(
              4,
              "0"
            )}`;
            const inserted = await tx
              .insert(erpInvoices)
              .values({
                schoolId,
                invoiceNumber,
                studentUserId: studentUserId ?? null,
                feeStructureId: feeStructureId ?? null,
                status: "draft",
                issueDate,
                dueDate: dueDate ?? null,
                subtotal: fromCents(subtotalCents),
                discount: fromCents(discountCents),
                tax: fromCents(taxCents),
                total: fromCents(totalCents),
                amountPaid: "0.00",
                notes: notes ?? null,
                createdBy: userId,
              })
              .returning();
            const invoice = inserted[0];
            if (!invoice) throw new Error("Invoice insert returned no row");
            await tx.insert(erpInvoiceItems).values(
              items.map((item, index) => ({
                schoolId,
                invoiceId: invoice.id,
                description: item.description,
                quantity: item.quantity.toFixed(2),
                unitPrice: item.unitPrice.toFixed(2),
                total: fromCents(toCents(item.quantity * item.unitPrice)),
                position: index,
              }))
            );
            return invoice;
          });
          break;
        } catch (error) {
          if (isUniqueViolation(error) && attempt < 5) continue;
          throw error;
        }
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        res
          .status(409)
          .json(errorResponse("Invoice number conflict, please retry", "INVOICE_NUMBER_CONFLICT"));
        return;
      }
      throw error;
    }

    if (!createdInvoice) {
      res.status(500).json(errorResponse("Failed to create invoice", "INTERNAL_ERROR"));
      return;
    }

    const itemRows = await db
      .select()
      .from(erpInvoiceItems)
      .where(eq(erpInvoiceItems.invoiceId, createdInvoice.id))
      .orderBy(asc(erpInvoiceItems.position), asc(erpInvoiceItems.id));

    res.status(201).json(successResponse({ invoice: { ...createdInvoice, items: itemRows } }));
  }
);

// PUT /invoices/:id/status — transition the invoice status
erpFinanceRouter.put(
  "/invoices/:id/status",
  requireSession,
  erpGuard("INVOICES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const invoiceId = parseIdParam(req.params.id);
    if (!invoiceId) {
      res.status(400).json(errorResponse("Invalid invoice ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = invoiceStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid invoice status", "VALIDATION_ERROR"));
      return;
    }

    const updated = await db
      .update(erpInvoices)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(erpInvoices.id, invoiceId), eq(erpInvoices.schoolId, schoolId)))
      .returning();
    const invoice = updated[0];
    if (!invoice) {
      res.status(404).json(errorResponse("Invoice not found", "INVOICE_NOT_FOUND"));
      return;
    }

    res.status(200).json(successResponse({ invoice }));
  }
);

// POST /invoices/:id/payments — record a payment and recompute invoice state
erpFinanceRouter.post(
  "/invoices/:id/payments",
  requireSession,
  erpGuard("PAYMENTS_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const userId = erpReq.session.user.id;

    const invoiceId = parseIdParam(req.params.id);
    if (!invoiceId) {
      res.status(400).json(errorResponse("Invalid invoice ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = paymentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid payment", "VALIDATION_ERROR"));
      return;
    }
    const { amount, method, reference, paidAt, notes } = parsed.data;

    const invoiceRows = await db
      .select()
      .from(erpInvoices)
      .where(and(eq(erpInvoices.id, invoiceId), eq(erpInvoices.schoolId, schoolId)))
      .limit(1);
    const invoice = invoiceRows[0];
    if (!invoice) {
      res.status(404).json(errorResponse("Invoice not found", "INVOICE_NOT_FOUND"));
      return;
    }
    if (invoice.status === "void") {
      res.status(409).json(errorResponse("Invoice is void", "INVOICE_VOID"));
      return;
    }

    const result = await db.transaction(async (tx) => {
      const insertedPayment = await tx
        .insert(erpPayments)
        .values({
          schoolId,
          invoiceId,
          amount: amount.toFixed(2),
          method,
          reference: reference ?? null,
          paidAt: paidAt !== undefined ? new Date(paidAt) : new Date(),
          notes: notes ?? null,
          recordedBy: userId,
        })
        .returning();
      const payment = insertedPayment[0];
      if (!payment) throw new Error("Payment insert returned no row");

      const [sumRow] = await tx
        .select({
          value: sql<string | null>`coalesce(sum(${erpPayments.amount}), 0)`,
        })
        .from(erpPayments)
        .where(eq(erpPayments.invoiceId, invoiceId));

      const paidCents = toCents(toNumber(sumRow?.value ?? null));
      const totalCents = toCents(toNumber(invoice.total));
      const nextStatus = paidCents >= totalCents ? "paid" : "partially_paid";

      const updatedInvoiceRows = await tx
        .update(erpInvoices)
        .set({
          amountPaid: sumRow?.value ?? "0",
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(erpInvoices.id, invoiceId), eq(erpInvoices.schoolId, schoolId)))
        .returning();
      const updatedInvoice = updatedInvoiceRows[0];
      if (!updatedInvoice) throw new Error("Invoice update returned no row");

      return { payment, invoice: updatedInvoice };
    });

    res.status(201).json(successResponse(result));
  }
);

// GET /payments — paginated payment ledger
erpFinanceRouter.get("/payments", requireSession, erpGuard("PAYMENTS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const { page, pageSize, offset } = parsePagination(erpReq);

  const conditions = [eq(erpPayments.schoolId, schoolId)];

  const invoiceIdRaw = firstQueryValue(req.query.invoiceId);
  if (invoiceIdRaw !== null) {
    const invoiceId = parseIdParam(invoiceIdRaw);
    if (!invoiceId) {
      res.status(400).json(errorResponse("Invalid invoice ID", "VALIDATION_ERROR"));
      return;
    }
    conditions.push(eq(erpPayments.invoiceId, invoiceId));
  }

  const from = firstQueryValue(req.query.from);
  if (from !== null) {
    const fromDate = parseDateBoundary(from, "00:00:00.000");
    if (!fromDate) {
      res.status(400).json(errorResponse("Invalid from date", "VALIDATION_ERROR"));
      return;
    }
    conditions.push(gte(erpPayments.paidAt, fromDate));
  }

  const to = firstQueryValue(req.query.to);
  if (to !== null) {
    const toDate = parseDateBoundary(to, "23:59:59.999");
    if (!toDate) {
      res.status(400).json(errorResponse("Invalid to date", "VALIDATION_ERROR"));
      return;
    }
    conditions.push(lte(erpPayments.paidAt, toDate));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      ...getTableColumns(erpPayments),
      invoiceNumber: erpInvoices.invoiceNumber,
    })
    .from(erpPayments)
    .innerJoin(erpInvoices, eq(erpInvoices.id, erpPayments.invoiceId))
    .where(where)
    .orderBy(desc(erpPayments.paidAt), desc(erpPayments.id))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db.select({ value: count() }).from(erpPayments).where(where);

  res
    .status(200)
    .json(successResponse({ items: rows, total: totalRow?.value ?? 0, page, pageSize }));
});

// GET /stats — outstanding, collected, and counts by status
erpFinanceRouter.get("/stats", requireSession, erpGuard("INVOICES_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const [totalsRow] = await db
    .select({
      outstanding: sql<
        string | null
      >`coalesce(sum(${erpInvoices.total} - ${erpInvoices.amountPaid}), 0)`,
      collected: sql<string | null>`coalesce(sum(${erpInvoices.amountPaid}), 0)`,
    })
    .from(erpInvoices)
    .where(and(eq(erpInvoices.schoolId, schoolId), ne(erpInvoices.status, "void")));

  const byStatus = await db
    .select({ status: erpInvoices.status, value: count() })
    .from(erpInvoices)
    .where(eq(erpInvoices.schoolId, schoolId))
    .groupBy(erpInvoices.status);

  res.status(200).json(
    successResponse({
      outstanding: toNumber(totalsRow?.outstanding ?? null),
      collected: toNumber(totalsRow?.collected ?? null),
      countByStatus: byStatus.map((row) => ({
        status: row.status,
        count: row.value,
      })),
    })
  );
});

// GET /my/invoices — self-service invoices for enrolled students / ERP users
erpFinanceRouter.get("/my/invoices", requireSession, async (req, res) => {
  const erpReq = req as ErpRequest;
  const userId = erpReq.session.user.id;

  const schoolId = parseSchoolId(erpReq);
  if (!schoolId) {
    res
      .status(400)
      .json(
        errorResponse(
          "schoolId is required (query, param, or x-school-id header)",
          "SCHOOL_ID_REQUIRED"
        )
      );
    return;
  }

  const enrollmentRows = await db
    .select({ id: erpEnrollments.id })
    .from(erpEnrollments)
    .where(and(eq(erpEnrollments.schoolId, schoolId), eq(erpEnrollments.studentUserId, userId)))
    .limit(1);

  if (!enrollmentRows[0]) {
    const access = await requireErpAccess(erpReq, res);
    if (!access) return;
  }

  const { page, pageSize, offset } = parsePagination(erpReq);

  const conditions = [eq(erpInvoices.schoolId, schoolId), eq(erpInvoices.studentUserId, userId)];

  const status = firstQueryValue(req.query.status);
  if (status !== null) {
    if (!INVOICE_STATUSES.includes(status)) {
      res.status(400).json(errorResponse("Invalid invoice status filter", "VALIDATION_ERROR"));
      return;
    }
    conditions.push(eq(erpInvoices.status, status));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      ...getTableColumns(erpInvoices),
      itemsCount: sql<number>`(select count(*)::int from ${erpInvoiceItems} where ${erpInvoiceItems.invoiceId} = ${erpInvoices.id})`,
    })
    .from(erpInvoices)
    .where(where)
    .orderBy(desc(erpInvoices.createdAt), desc(erpInvoices.id))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db.select({ value: count() }).from(erpInvoices).where(where);

  res
    .status(200)
    .json(successResponse({ items: rows, total: totalRow?.value ?? 0, page, pageSize }));
});
