/**
 * Expense Functions
 */

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { erpEmployees, erpExpenseCategories, erpExpenses } from "../../../db/schema/erp/hrm.js";
import {
  registerHrmFunction,
  type HrmFunctionContext,
  type PaginationParams,
  type PaginatedResult,
  HrmError,
  normalizePagination,
} from "./types.js";

// ============================================================================
// Constants & Schemas
// ============================================================================

const EXPENSE_STATUSES = ["submitted", "approved", "rejected", "reimbursed"] as const;

export const expenseBodySchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive().max(99_999_999.99),
  categoryId: z.number().int().positive().nullable().optional(),
  employeeId: z.number().int().positive().nullable().optional(),
  currency: z.string().min(1).max(8).optional(),
  spentAt: z.iso.date(),
  notes: z.string().max(2000).nullable().optional(),
});

export const expenseStatusBodySchema = z.object({
  status: z.enum(EXPENSE_STATUSES),
});

export const expenseCategoryBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
});

export type ExpenseInput = z.infer<typeof expenseBodySchema>;
export type ExpenseStatusInput = z.infer<typeof expenseStatusBodySchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategoryBodySchema>;

export interface Expense {
  id: number;
  schoolId: number;
  categoryId: number | null;
  employeeId: number | null;
  title: string;
  amount: string;
  currency: string;
  spentAt: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseCategory {
  id: number;
  schoolId: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface ExpenseListParams extends PaginationParams {
  status?: string;
  categoryId?: number;
}

export interface ExpenseListResult extends PaginatedResult<
  Expense & {
    categoryName: string | null;
    employeeName: string | null;
  }
> {}

// ============================================================================
// Helpers
// ============================================================================

const money = (value: number): string => value.toFixed(2);

async function employeeExistsInSchool(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

// ============================================================================
// Expense Functions
// ============================================================================

async function listExpenses(
  context: HrmFunctionContext,
  params: ExpenseListParams
): Promise<ExpenseListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const filters = [eq(erpExpenses.schoolId, context.schoolId)];

  if (params.status !== undefined) {
    if (!(EXPENSE_STATUSES as readonly string[]).includes(params.status)) {
      throw HrmError.validation("Invalid status");
    }
    filters.push(eq(erpExpenses.status, params.status));
  }

  if (params.categoryId !== undefined) {
    filters.push(eq(erpExpenses.categoryId, params.categoryId));
  }

  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: erpExpenses.id,
        categoryId: erpExpenses.categoryId,
        categoryName: erpExpenseCategories.name,
        employeeId: erpExpenses.employeeId,
        employeeName: sql<
          string | null
        >`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
        title: erpExpenses.title,
        amount: erpExpenses.amount,
        currency: erpExpenses.currency,
        spentAt: erpExpenses.spentAt,
        status: erpExpenses.status,
        notes: erpExpenses.notes,
        createdBy: erpExpenses.createdBy,
        createdAt: erpExpenses.createdAt,
      })
      .from(erpExpenses)
      .leftJoin(
        erpExpenseCategories,
        and(
          eq(erpExpenseCategories.id, erpExpenses.categoryId),
          eq(erpExpenseCategories.schoolId, context.schoolId)
        )
      )
      .leftJoin(
        erpEmployees,
        and(
          eq(erpEmployees.id, erpExpenses.employeeId),
          eq(erpEmployees.schoolId, context.schoolId)
        )
      )
      .where(where)
      .orderBy(desc(erpExpenses.spentAt), desc(erpExpenses.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(erpExpenses).where(where),
  ]);

  return {
    items: rows as ExpenseListResult["items"],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function createExpense(context: HrmFunctionContext, input: ExpenseInput): Promise<Expense> {
  const parsed = expenseBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid expense", parsed.error.flatten());
  }
  const body = parsed.data;

  if (body.categoryId !== undefined && body.categoryId !== null) {
    const category = await db
      .select({ id: erpExpenseCategories.id })
      .from(erpExpenseCategories)
      .where(
        and(
          eq(erpExpenseCategories.id, body.categoryId),
          eq(erpExpenseCategories.schoolId, context.schoolId)
        )
      )
      .limit(1);
    if (!category[0]) {
      throw HrmError.notFound("Expense category", body.categoryId);
    }
  }

  if (body.employeeId !== undefined && body.employeeId !== null) {
    if (!(await employeeExistsInSchool(context.schoolId, body.employeeId))) {
      throw HrmError.notFound("Employee", body.employeeId);
    }
  }

  const inserted = await db
    .insert(erpExpenses)
    .values({
      schoolId: context.schoolId,
      categoryId: body.categoryId ?? null,
      employeeId: body.employeeId ?? null,
      title: body.title,
      amount: money(body.amount),
      currency: body.currency ?? "PKR",
      spentAt: body.spentAt,
      status: "submitted",
      notes: body.notes ?? null,
      createdBy: context.userId,
    })
    .returning();

  const expense = inserted[0];
  if (!expense) {
    throw HrmError.internal("Failed to create expense");
  }

  return expense as Expense;
}

async function updateExpenseStatus(
  context: HrmFunctionContext,
  input: { expenseId: number } & ExpenseStatusInput
): Promise<Expense> {
  const { expenseId, status } = input;

  const parsed = expenseStatusBodySchema.safeParse({ status });
  if (!parsed.success) {
    throw HrmError.validation("Invalid expense status", parsed.error.flatten());
  }

  const updated = await db
    .update(erpExpenses)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(erpExpenses.id, expenseId), eq(erpExpenses.schoolId, context.schoolId)))
    .returning();

  const expense = updated[0];
  if (!expense) {
    throw HrmError.notFound("Expense", expenseId);
  }

  return expense as Expense;
}

// ============================================================================
// Expense Category Functions
// ============================================================================

async function listExpenseCategories(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<{ categories: ExpenseCategory[] }> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(erpExpenseCategories)
      .where(eq(erpExpenseCategories.schoolId, context.schoolId))
      .orderBy(asc(erpExpenseCategories.name))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(erpExpenseCategories)
      .where(eq(erpExpenseCategories.schoolId, context.schoolId)),
  ]);

  return { categories: rows as ExpenseCategory[] };
}

async function createExpenseCategory(
  context: HrmFunctionContext,
  input: ExpenseCategoryInput
): Promise<ExpenseCategory> {
  const parsed = expenseCategoryBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid expense category", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpExpenseCategories.id })
    .from(erpExpenseCategories)
    .where(
      and(
        eq(erpExpenseCategories.schoolId, context.schoolId),
        eq(erpExpenseCategories.name, parsed.data.name)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw HrmError.conflict("Expense category", "name");
  }

  const inserted = await db
    .insert(erpExpenseCategories)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  const category = inserted[0];
  if (!category) {
    throw HrmError.internal("Failed to create expense category");
  }

  return category as ExpenseCategory;
}

async function deleteExpenseCategory(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const deleted = await db
    .delete(erpExpenseCategories)
    .where(
      and(eq(erpExpenseCategories.id, args.id), eq(erpExpenseCategories.schoolId, context.schoolId))
    )
    .returning({ id: erpExpenseCategories.id });

  if (deleted.length === 0) {
    throw HrmError.notFound("Expense category", args.id);
  }

  return { deleted: true };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction("listExpenses", listExpenses, "EXPENSES_VIEW", "List expenses with filters");

registerHrmFunction("createExpense", createExpense, "EXPENSES_MANAGE", "Create a new expense");

registerHrmFunction(
  "updateExpenseStatus",
  updateExpenseStatus,
  "EXPENSES_MANAGE",
  "Update expense status"
);

registerHrmFunction(
  "listExpenseCategories",
  listExpenseCategories,
  "EXPENSES_VIEW",
  "List expense categories"
);

registerHrmFunction(
  "createExpenseCategory",
  createExpenseCategory,
  "EXPENSES_MANAGE",
  "Create a new expense category"
);

registerHrmFunction(
  "deleteExpenseCategory",
  deleteExpenseCategory,
  "EXPENSES_MANAGE",
  "Delete an expense category"
);
