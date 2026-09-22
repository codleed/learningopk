/**
 * Time Off Functions (Policies, Requests, Holidays)
 */

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import {
  erpEmployees,
  erpTimeOffPolicies,
  erpTimeOffRequests,
  erpOfficialHolidays,
} from "../../../db/schema/erp/hrm.js";
import { ERP_TIME_OFF_STATUSES } from "@learningopk/shared";
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

export const timeOffPolicyBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
  paid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  annualDays: z.number().int().min(0).max(365).optional(),
});

export const timeOffBodySchema = z.object({
  employeeId: z.number().int().positive(),
  policyId: z.number().int().positive(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  reason: z.string().max(2000).nullable().optional(),
});

export const timeOffDecideBodySchema = z.object({
  decision: z.enum(["approved", "refused"]),
});

export const holidayBodySchema = z.object({
  name: z.string().min(1).max(160),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export type TimeOffPolicyInput = z.infer<typeof timeOffPolicyBodySchema>;
export type TimeOffRequestInput = z.infer<typeof timeOffBodySchema>;
export type TimeOffDecideInput = z.infer<typeof timeOffDecideBodySchema>;
export type HolidayInput = z.infer<typeof holidayBodySchema>;

export interface TimeOffPolicy {
  id: number;
  schoolId: number;
  name: string;
  description: string | null;
  paid: boolean;
  requiresApproval: boolean;
  annualDays: number;
  createdAt: Date;
}

export interface TimeOffRequest {
  id: number;
  schoolId: number;
  employeeId: number;
  policyId: number;
  startDate: string;
  endDate: string;
  status: string;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Holiday {
  id: number;
  schoolId: number;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: Date;
}

export interface TimeOffListParams extends PaginationParams {
  status?: string;
  employeeId?: number;
}

export interface TimeOffListResult extends PaginatedResult<
  TimeOffRequest & {
    employeeName: string;
    policyName: string | null;
  }
> {}

// ============================================================================
// Helpers
// ============================================================================

async function employeeExistsInSchool(schoolId: number, employeeId: number): Promise<boolean> {
  const rows = await db
    .select({ id: erpEmployees.id })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.id, employeeId), eq(erpEmployees.schoolId, schoolId)))
    .limit(1);
  return rows[0] !== undefined;
}

// ============================================================================
// Time Off Policy Functions
// ============================================================================

async function listTimeOffPolicies(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<{ policies: TimeOffPolicy[] }> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(erpTimeOffPolicies)
      .where(eq(erpTimeOffPolicies.schoolId, context.schoolId))
      .orderBy(asc(erpTimeOffPolicies.name))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(erpTimeOffPolicies)
      .where(eq(erpTimeOffPolicies.schoolId, context.schoolId)),
  ]);

  return { policies: rows as TimeOffPolicy[] };
}

async function createTimeOffPolicy(
  context: HrmFunctionContext,
  input: TimeOffPolicyInput
): Promise<TimeOffPolicy> {
  const parsed = timeOffPolicyBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid time off policy", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpTimeOffPolicies.id })
    .from(erpTimeOffPolicies)
    .where(
      and(
        eq(erpTimeOffPolicies.schoolId, context.schoolId),
        eq(erpTimeOffPolicies.name, parsed.data.name)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw HrmError.conflict("Time off policy", "name");
  }

  const inserted = await db
    .insert(erpTimeOffPolicies)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      paid: parsed.data.paid ?? true,
      requiresApproval: parsed.data.requiresApproval ?? true,
      annualDays: parsed.data.annualDays ?? 0,
    })
    .returning();

  const policy = inserted[0];
  if (!policy) {
    throw HrmError.internal("Failed to create time off policy");
  }

  return policy as TimeOffPolicy;
}

// ============================================================================
// Time Off Request Functions
// ============================================================================

async function listTimeOffRequests(
  context: HrmFunctionContext,
  params: TimeOffListParams
): Promise<TimeOffListResult> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const filters = [eq(erpTimeOffRequests.schoolId, context.schoolId)];

  if (params.status !== undefined) {
    if (!(ERP_TIME_OFF_STATUSES as readonly string[]).includes(params.status)) {
      throw HrmError.validation("Invalid status");
    }
    filters.push(eq(erpTimeOffRequests.status, params.status));
  }

  if (params.employeeId !== undefined) {
    filters.push(eq(erpTimeOffRequests.employeeId, params.employeeId));
  }

  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: erpTimeOffRequests.id,
        employeeId: erpTimeOffRequests.employeeId,
        employeeName: sql<string>`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
        policyId: erpTimeOffRequests.policyId,
        policyName: erpTimeOffPolicies.name,
        startDate: erpTimeOffRequests.startDate,
        endDate: erpTimeOffRequests.endDate,
        status: erpTimeOffRequests.status,
        reason: erpTimeOffRequests.reason,
        decidedBy: erpTimeOffRequests.decidedBy,
        decidedAt: erpTimeOffRequests.decidedAt,
        createdAt: erpTimeOffRequests.createdAt,
      })
      .from(erpTimeOffRequests)
      .innerJoin(
        erpEmployees,
        and(
          eq(erpEmployees.id, erpTimeOffRequests.employeeId),
          eq(erpEmployees.schoolId, context.schoolId)
        )
      )
      .leftJoin(
        erpTimeOffPolicies,
        and(
          eq(erpTimeOffPolicies.id, erpTimeOffRequests.policyId),
          eq(erpTimeOffPolicies.schoolId, context.schoolId)
        )
      )
      .where(where)
      .orderBy(desc(erpTimeOffRequests.createdAt), desc(erpTimeOffRequests.id))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(erpTimeOffRequests).where(where),
  ]);

  return {
    items: rows as TimeOffListResult["items"],
    total: Number(totalRows[0]?.value ?? 0),
    page,
    pageSize,
  };
}

async function createTimeOffRequest(
  context: HrmFunctionContext,
  input: TimeOffRequestInput
): Promise<TimeOffRequest> {
  const parsed = timeOffBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid time off request", parsed.error.flatten());
  }
  const body = parsed.data;

  if (body.startDate > body.endDate) {
    throw HrmError.validation("Start date must not be after end date", {
      code: "INVALID_DATE_RANGE",
    });
  }

  if (!(await employeeExistsInSchool(context.schoolId, body.employeeId))) {
    throw HrmError.notFound("Employee", body.employeeId);
  }

  const policyRows = await db
    .select()
    .from(erpTimeOffPolicies)
    .where(
      and(
        eq(erpTimeOffPolicies.id, body.policyId),
        eq(erpTimeOffPolicies.schoolId, context.schoolId)
      )
    )
    .limit(1);
  const policy = policyRows[0];
  if (!policy) {
    throw HrmError.notFound("Time off policy", body.policyId);
  }

  const autoApproved = !policy.requiresApproval;
  const now = new Date();

  const inserted = await db
    .insert(erpTimeOffRequests)
    .values({
      schoolId: context.schoolId,
      employeeId: body.employeeId,
      policyId: body.policyId,
      startDate: body.startDate,
      endDate: body.endDate,
      status: autoApproved ? "approved" : "requested",
      reason: body.reason ?? null,
      decidedBy: autoApproved ? context.userId : null,
      decidedAt: autoApproved ? now : null,
    })
    .returning();

  const request = inserted[0];
  if (!request) {
    throw HrmError.internal("Failed to create time off request");
  }

  return request as TimeOffRequest;
}

async function decideTimeOffRequest(
  context: HrmFunctionContext,
  input: { requestId: number } & TimeOffDecideInput
): Promise<TimeOffRequest> {
  const { requestId, decision } = input;

  const parsed = timeOffDecideBodySchema.safeParse({ decision });
  if (!parsed.success) {
    throw HrmError.validation("Invalid decision", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpTimeOffRequests.id, status: erpTimeOffRequests.status })
    .from(erpTimeOffRequests)
    .where(
      and(eq(erpTimeOffRequests.id, requestId), eq(erpTimeOffRequests.schoolId, context.schoolId))
    )
    .limit(1);
  const request = existing[0];
  if (!request) {
    throw HrmError.notFound("Time off request", requestId);
  }
  if (request.status !== "requested") {
    throw HrmError.validation("Time off request is already decided", {
      code: "TIME_OFF_ALREADY_DECIDED",
    });
  }

  const now = new Date();
  const updated = await db
    .update(erpTimeOffRequests)
    .set({
      status: parsed.data.decision,
      decidedBy: context.userId,
      decidedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(erpTimeOffRequests.id, requestId),
        eq(erpTimeOffRequests.schoolId, context.schoolId),
        eq(erpTimeOffRequests.status, "requested")
      )
    )
    .returning();

  const decided = updated[0];
  if (!decided) {
    throw HrmError.validation("Time off request is already decided", {
      code: "TIME_OFF_ALREADY_DECIDED",
    });
  }

  return decided as TimeOffRequest;
}

// ============================================================================
// Official Holiday Functions
// ============================================================================

async function listHolidays(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<{ holidays: Holiday[] }> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(erpOfficialHolidays)
      .where(eq(erpOfficialHolidays.schoolId, context.schoolId))
      .orderBy(asc(erpOfficialHolidays.startDate))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(erpOfficialHolidays)
      .where(eq(erpOfficialHolidays.schoolId, context.schoolId)),
  ]);

  return { holidays: rows as Holiday[] };
}

async function createHoliday(context: HrmFunctionContext, input: HolidayInput): Promise<Holiday> {
  const parsed = holidayBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid holiday", parsed.error.flatten());
  }
  if (parsed.data.startDate > parsed.data.endDate) {
    throw HrmError.validation("Start date must not be after end date", {
      code: "INVALID_DATE_RANGE",
    });
  }

  const inserted = await db
    .insert(erpOfficialHolidays)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    })
    .returning();

  const holiday = inserted[0];
  if (!holiday) {
    throw HrmError.internal("Failed to create holiday");
  }

  return holiday as Holiday;
}

async function deleteHoliday(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const deleted = await db
    .delete(erpOfficialHolidays)
    .where(
      and(eq(erpOfficialHolidays.id, args.id), eq(erpOfficialHolidays.schoolId, context.schoolId))
    )
    .returning({ id: erpOfficialHolidays.id });

  if (deleted.length === 0) {
    throw HrmError.notFound("Holiday", args.id);
  }

  return { deleted: true };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listTimeOffPolicies",
  listTimeOffPolicies,
  "TIME_OFF_VIEW",
  "List all time off policies"
);

registerHrmFunction(
  "createTimeOffPolicy",
  createTimeOffPolicy,
  "TIME_OFF_APPROVE",
  "Create a new time off policy"
);

registerHrmFunction(
  "listTimeOffRequests",
  listTimeOffRequests,
  "TIME_OFF_VIEW",
  "List time off requests with filters"
);

registerHrmFunction(
  "createTimeOffRequest",
  createTimeOffRequest,
  "TIME_OFF_REQUEST",
  "Create a new time off request"
);

registerHrmFunction(
  "decideTimeOffRequest",
  decideTimeOffRequest,
  "TIME_OFF_APPROVE",
  "Approve or refuse a time off request"
);

registerHrmFunction("listHolidays", listHolidays, "TIME_OFF_VIEW", "List official holidays");

registerHrmFunction(
  "createHoliday",
  createHoliday,
  "TIME_OFF_APPROVE",
  "Create an official holiday"
);

registerHrmFunction(
  "deleteHoliday",
  deleteHoliday,
  "TIME_OFF_APPROVE",
  "Delete an official holiday"
);
