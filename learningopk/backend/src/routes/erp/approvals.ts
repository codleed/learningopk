import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { ERP_APPROVAL_STATUSES, ERP_REQUEST_APPROVAL_TYPES } from "@learningopk/shared";

import { db } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import {
  erpApprovalPolicies,
  erpRequestApprovals,
  erpRequestApprovalVoters,
} from "../../lib/db/schema/erp/approvals.js";
import { erpEmployees, erpExpenses, erpTimeOffRequests } from "../../lib/db/schema/erp/hrm.js";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";

export const erpApprovalsRouter = Router();

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

function parsePageQuery(req: ErpRequest): { page: number; pageSize: number; offset: number } {
  const pageValue = Number.parseInt(firstQueryValue(req.query.page) ?? "1", 10);
  const pageSizeValue = Number.parseInt(firstQueryValue(req.query.pageSize) ?? "20", 10);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize =
    Number.isSafeInteger(pageSizeValue) && pageSizeValue > 0 ? Math.min(pageSizeValue, 100) : 20;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

// ---------------------------------------------------------------------------
// Approval policies
// ---------------------------------------------------------------------------

const policyBodySchema = z.object({
  name: z.string().min(1).max(120),
  requestType: z.enum(ERP_REQUEST_APPROVAL_TYPES),
  description: z.string().max(600).optional(),
  minApprovals: z.number().int().min(1).max(50).optional(),
  approverEmployeeIds: z.array(z.number().int().positive()).max(100).optional(),
  isActive: z.boolean().optional(),
});

// GET /policies — list approval policies
erpApprovalsRouter.get(
  "/policies",
  requireSession,
  erpGuard("APPROVAL_POLICIES_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;

    const rows = await db
      .select()
      .from(erpApprovalPolicies)
      .where(eq(erpApprovalPolicies.schoolId, schoolId))
      .orderBy(erpApprovalPolicies.requestType, desc(erpApprovalPolicies.id));

    res.status(200).json(successResponse({ policies: rows }));
  }
);

// POST /policies — create an approval policy (unique per request type in school)
erpApprovalsRouter.post(
  "/policies",
  requireSession,
  erpGuard("APPROVAL_POLICIES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = policyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid policy", "VALIDATION_ERROR"));
      return;
    }
    const { name, requestType, description, minApprovals, approverEmployeeIds, isActive } =
      parsed.data;

    const existing = await db
      .select({ id: erpApprovalPolicies.id })
      .from(erpApprovalPolicies)
      .where(
        and(
          eq(erpApprovalPolicies.schoolId, schoolId),
          eq(erpApprovalPolicies.requestType, requestType)
        )
      )
      .limit(1);
    if (existing[0]) {
      res
        .status(409)
        .json(errorResponse("Policy for this request type already exists", "POLICY_EXISTS"));
      return;
    }

    const inserted = await db
      .insert(erpApprovalPolicies)
      .values({
        schoolId,
        name,
        requestType,
        description: description ?? null,
        minApprovals: minApprovals ?? 1,
        approverEmployeeIds:
          approverEmployeeIds && approverEmployeeIds.length > 0 ? approverEmployeeIds : null,
        isActive: isActive ?? true,
      })
      .returning();
    res.status(201).json(successResponse({ policy: inserted[0] }));
  }
);

// PUT /policies/:id — update an approval policy
erpApprovalsRouter.put(
  "/policies/:id",
  requireSession,
  erpGuard("APPROVAL_POLICIES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const policyId = parseIdParam(req.params.id);
    if (!policyId) {
      res.status(400).json(errorResponse("Invalid policy ID", "VALIDATION_ERROR"));
      return;
    }

    const parsed = policyBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid policy update", "VALIDATION_ERROR"));
      return;
    }
    const { name, requestType, description, minApprovals, approverEmployeeIds, isActive } =
      parsed.data;

    const policyRows = await db
      .select()
      .from(erpApprovalPolicies)
      .where(and(eq(erpApprovalPolicies.id, policyId), eq(erpApprovalPolicies.schoolId, schoolId)))
      .limit(1);
    const policy = policyRows[0];
    if (!policy) {
      res.status(404).json(errorResponse("Policy not found", "POLICY_NOT_FOUND"));
      return;
    }

    if (requestType !== undefined && requestType !== policy.requestType) {
      const conflict = await db
        .select({ id: erpApprovalPolicies.id })
        .from(erpApprovalPolicies)
        .where(
          and(
            eq(erpApprovalPolicies.schoolId, schoolId),
            eq(erpApprovalPolicies.requestType, requestType)
          )
        )
        .limit(1);
      if (conflict[0]) {
        res
          .status(409)
          .json(errorResponse("Policy for this request type already exists", "POLICY_EXISTS"));
        return;
      }
    }

    const updated = await db
      .update(erpApprovalPolicies)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(requestType !== undefined ? { requestType } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(minApprovals !== undefined ? { minApprovals } : {}),
        ...(approverEmployeeIds !== undefined
          ? {
              approverEmployeeIds: approverEmployeeIds.length > 0 ? approverEmployeeIds : null,
            }
          : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(erpApprovalPolicies.id, policyId), eq(erpApprovalPolicies.schoolId, schoolId)))
      .returning();
    if (updated.length === 0) {
      res.status(404).json(errorResponse("Policy not found", "POLICY_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ policy: updated[0] }));
  }
);

// DELETE /policies/:id
erpApprovalsRouter.delete(
  "/policies/:id",
  requireSession,
  erpGuard("APPROVAL_POLICIES_MANAGE"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const policyId = parseIdParam(req.params.id);
    if (!policyId) {
      res.status(400).json(errorResponse("Invalid policy ID", "VALIDATION_ERROR"));
      return;
    }

    const deleted = await db
      .delete(erpApprovalPolicies)
      .where(and(eq(erpApprovalPolicies.id, policyId), eq(erpApprovalPolicies.schoolId, schoolId)))
      .returning({ id: erpApprovalPolicies.id });
    if (deleted.length === 0) {
      res.status(404).json(errorResponse("Policy not found", "POLICY_NOT_FOUND"));
      return;
    }
    res.status(200).json(successResponse({ deleted: true }));
  }
);

// ---------------------------------------------------------------------------
// Request approvals
// ---------------------------------------------------------------------------

const requestBodySchema = z.object({
  requestType: z.enum(ERP_REQUEST_APPROVAL_TYPES),
  requestId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  requestedByEmployeeId: z.number().int().positive().optional(),
});

type VoterSummary = {
  voterUserId: string;
  name: string;
  vote: string;
  comment: string | null;
  votedAt: Date;
};

async function loadVoters(approvalIds: number[]): Promise<Map<number, VoterSummary[]>> {
  const map = new Map<number, VoterSummary[]>();
  if (approvalIds.length === 0) return map;
  const rows = await db
    .select({
      requestApprovalId: erpRequestApprovalVoters.requestApprovalId,
      voterUserId: erpRequestApprovalVoters.voterUserId,
      name: users.name,
      vote: erpRequestApprovalVoters.vote,
      comment: erpRequestApprovalVoters.comment,
      votedAt: erpRequestApprovalVoters.votedAt,
    })
    .from(erpRequestApprovalVoters)
    .innerJoin(users, eq(users.id, erpRequestApprovalVoters.voterUserId))
    .where(inArray(erpRequestApprovalVoters.requestApprovalId, approvalIds));
  for (const row of rows) {
    const list = map.get(row.requestApprovalId) ?? [];
    list.push({
      voterUserId: row.voterUserId,
      name: row.name,
      vote: row.vote,
      comment: row.comment,
      votedAt: row.votedAt,
    });
    map.set(row.requestApprovalId, list);
  }
  return map;
}

async function findExistingRequest(
  schoolId: number,
  requestType: string,
  requestId: number
): Promise<typeof erpRequestApprovals.$inferSelect | null> {
  const rows = await db
    .select()
    .from(erpRequestApprovals)
    .where(
      and(
        eq(erpRequestApprovals.schoolId, schoolId),
        eq(erpRequestApprovals.requestType, requestType),
        eq(erpRequestApprovals.requestId, requestId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

// GET /requests — paginated request approvals with voters and requester name
erpApprovalsRouter.get(
  "/requests",
  requireSession,
  erpGuard("APPROVALS_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const { page, pageSize, offset } = parsePageQuery(erpReq);
    const status = firstQueryValue(erpReq.query.status);
    const requestType = firstQueryValue(erpReq.query.requestType);

    const filters = [eq(erpRequestApprovals.schoolId, schoolId)];
    if (status) {
      if (!(ERP_APPROVAL_STATUSES as readonly string[]).includes(status)) {
        res.status(400).json(errorResponse("Invalid status", "VALIDATION_ERROR"));
        return;
      }
      filters.push(eq(erpRequestApprovals.status, status));
    }
    if (requestType) {
      if (!(ERP_REQUEST_APPROVAL_TYPES as readonly string[]).includes(requestType)) {
        res.status(400).json(errorResponse("Invalid request type", "VALIDATION_ERROR"));
        return;
      }
      filters.push(eq(erpRequestApprovals.requestType, requestType));
    }
    const where = and(...filters);

    const rows = await db
      .select({
        id: erpRequestApprovals.id,
        policyId: erpRequestApprovals.policyId,
        requestType: erpRequestApprovals.requestType,
        requestId: erpRequestApprovals.requestId,
        title: erpRequestApprovals.title,
        description: erpRequestApprovals.description,
        status: erpRequestApprovals.status,
        minApprovals: erpRequestApprovals.minApprovals,
        requestedByEmployeeId: erpRequestApprovals.requestedByEmployeeId,
        requestedByUserId: erpRequestApprovals.requestedByUserId,
        requestedByName: users.name,
        decidedAt: erpRequestApprovals.decidedAt,
        createdAt: erpRequestApprovals.createdAt,
      })
      .from(erpRequestApprovals)
      .leftJoin(users, eq(users.id, erpRequestApprovals.requestedByUserId))
      .where(where)
      .orderBy(desc(erpRequestApprovals.createdAt), desc(erpRequestApprovals.id))
      .limit(pageSize)
      .offset(offset);

    const totalRows = await db.select({ count: count() }).from(erpRequestApprovals).where(where);
    const total = Number(totalRows[0]?.count ?? 0);

    const votersMap = await loadVoters(rows.map((row) => row.id));
    const items = rows.map((row) => ({
      ...row,
      voters: votersMap.get(row.id) ?? [],
    }));

    res.status(200).json(successResponse({ items, total, page, pageSize }));
  }
);

// GET /requests/:id — single request approval with voters
erpApprovalsRouter.get(
  "/requests/:id",
  requireSession,
  erpGuard("APPROVALS_VIEW"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const approvalId = parseIdParam(req.params.id);
    if (!approvalId) {
      res.status(400).json(errorResponse("Invalid request ID", "VALIDATION_ERROR"));
      return;
    }

    const rows = await db
      .select({
        id: erpRequestApprovals.id,
        policyId: erpRequestApprovals.policyId,
        requestType: erpRequestApprovals.requestType,
        requestId: erpRequestApprovals.requestId,
        title: erpRequestApprovals.title,
        description: erpRequestApprovals.description,
        status: erpRequestApprovals.status,
        minApprovals: erpRequestApprovals.minApprovals,
        requestedByEmployeeId: erpRequestApprovals.requestedByEmployeeId,
        requestedByUserId: erpRequestApprovals.requestedByUserId,
        requestedByName: users.name,
        decidedAt: erpRequestApprovals.decidedAt,
        createdAt: erpRequestApprovals.createdAt,
      })
      .from(erpRequestApprovals)
      .leftJoin(users, eq(users.id, erpRequestApprovals.requestedByUserId))
      .where(
        and(eq(erpRequestApprovals.id, approvalId), eq(erpRequestApprovals.schoolId, schoolId))
      )
      .limit(1);
    const request = rows[0];
    if (!request) {
      res.status(404).json(errorResponse("Request not found", "APPROVAL_NOT_FOUND"));
      return;
    }

    const votersMap = await loadVoters([request.id]);
    res
      .status(200)
      .json(successResponse({ request: { ...request, voters: votersMap.get(request.id) ?? [] } }));
  }
);

// POST /requests — create a request approval (idempotent per requestType+requestId)
erpApprovalsRouter.post(
  "/requests",
  requireSession,
  erpGuard("APPROVALS_ACT"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const parsed = requestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid request", "VALIDATION_ERROR"));
      return;
    }
    const { requestType, requestId, title, description, requestedByEmployeeId } = parsed.data;

    const preExisting = await findExistingRequest(schoolId, requestType, requestId);
    if (preExisting) {
      const votersMap = await loadVoters([preExisting.id]);
      res.status(200).json(
        successResponse({
          request: { ...preExisting, voters: votersMap.get(preExisting.id) ?? [] },
          existing: true,
        })
      );
      return;
    }

    const policyRows = await db
      .select()
      .from(erpApprovalPolicies)
      .where(
        and(
          eq(erpApprovalPolicies.schoolId, schoolId),
          eq(erpApprovalPolicies.requestType, requestType),
          eq(erpApprovalPolicies.isActive, true)
        )
      )
      .limit(1);
    const policy = policyRows[0];
    const minApprovals = policy?.minApprovals ?? 1;

    const inserted = await db
      .insert(erpRequestApprovals)
      .values({
        schoolId,
        policyId: policy?.id ?? null,
        requestType,
        requestId,
        title,
        description: description ?? null,
        status: "requested",
        minApprovals,
        requestedByEmployeeId: requestedByEmployeeId ?? null,
        requestedByUserId: erpReq.session.user.id,
      })
      .onConflictDoNothing({
        target: [
          erpRequestApprovals.schoolId,
          erpRequestApprovals.requestType,
          erpRequestApprovals.requestId,
        ],
      })
      .returning();

    const created = inserted[0];
    if (!created) {
      const raced = await findExistingRequest(schoolId, requestType, requestId);
      if (!raced) {
        res.status(500).json(errorResponse("Failed to create request", "INTERNAL_ERROR"));
        return;
      }
      const votersMap = await loadVoters([raced.id]);
      res.status(200).json(
        successResponse({
          request: { ...raced, voters: votersMap.get(raced.id) ?? [] },
          existing: true,
        })
      );
      return;
    }

    res.status(201).json(successResponse({ request: { ...created, voters: [] }, existing: false }));
  }
);

// POST /requests/:id/vote — cast or update a vote, then recompute quorum
erpApprovalsRouter.post(
  "/requests/:id/vote",
  requireSession,
  erpGuard("APPROVALS_ACT"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const voterUserId = erpReq.session.user.id;
    const approvalId = parseIdParam(req.params.id);
    if (!approvalId) {
      res.status(400).json(errorResponse("Invalid request ID", "VALIDATION_ERROR"));
      return;
    }

    const voteSchema = z.object({
      vote: z.enum(["approve", "refuse"]),
      comment: z.string().max(500).optional(),
    });
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("Invalid vote", "VALIDATION_ERROR"));
      return;
    }
    const { vote, comment } = parsed.data;

    const requestRows = await db
      .select()
      .from(erpRequestApprovals)
      .where(
        and(eq(erpRequestApprovals.id, approvalId), eq(erpRequestApprovals.schoolId, schoolId))
      )
      .limit(1);
    const request = requestRows[0];
    if (!request) {
      res.status(404).json(errorResponse("Request not found", "APPROVAL_NOT_FOUND"));
      return;
    }
    if (request.status !== "requested") {
      res.status(400).json(errorResponse("Request is already decided", "APPROVAL_ALREADY_DECIDED"));
      return;
    }

    if (request.policyId) {
      const policyRows = await db
        .select()
        .from(erpApprovalPolicies)
        .where(
          and(
            eq(erpApprovalPolicies.id, request.policyId),
            eq(erpApprovalPolicies.schoolId, schoolId)
          )
        )
        .limit(1);
      const policy = policyRows[0];
      if (policy?.approverEmployeeIds && policy.approverEmployeeIds.length > 0) {
        const voterEmployeeRows = await db
          .select({ id: erpEmployees.id })
          .from(erpEmployees)
          .where(and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.userId, voterUserId)));
        const allowed = voterEmployeeRows.some((row) =>
          policy.approverEmployeeIds!.includes(row.id)
        );
        if (!allowed) {
          res
            .status(403)
            .json(errorResponse("Not an allowed approver for this policy", "FORBIDDEN"));
          return;
        }
      }
    }

    await db
      .insert(erpRequestApprovalVoters)
      .values({
        schoolId,
        requestApprovalId: approvalId,
        voterUserId,
        vote,
        comment: comment ?? null,
        votedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [erpRequestApprovalVoters.requestApprovalId, erpRequestApprovalVoters.voterUserId],
        set: { vote, comment: comment ?? null, votedAt: new Date() },
      });

    const voteRows = await db
      .select({ vote: erpRequestApprovalVoters.vote })
      .from(erpRequestApprovalVoters)
      .where(
        and(
          eq(erpRequestApprovalVoters.requestApprovalId, approvalId),
          eq(erpRequestApprovalVoters.schoolId, schoolId)
        )
      );
    const approveCount = voteRows.filter((v) => v.vote === "approve").length;
    const refuseCount = voteRows.filter((v) => v.vote === "refuse").length;

    let nextStatus: "requested" | "approved" | "refused" = "requested";
    if (approveCount >= request.minApprovals) {
      nextStatus = "approved";
    } else if (refuseCount > 0) {
      nextStatus = "refused";
    }

    const now = new Date();
    if (nextStatus === "requested") {
      const votersMap = await loadVoters([approvalId]);
      res.status(200).json(
        successResponse({
          request: { ...request, voters: votersMap.get(approvalId) ?? [] },
          approveCount,
          refuseCount,
        })
      );
      return;
    }

    const updated = await db
      .update(erpRequestApprovals)
      .set({ status: nextStatus, decidedAt: now, updatedAt: now })
      .where(
        and(
          eq(erpRequestApprovals.id, approvalId),
          eq(erpRequestApprovals.schoolId, schoolId),
          eq(erpRequestApprovals.status, "requested")
        )
      )
      .returning();

    const decided = updated[0] !== undefined;
    if (!decided) {
      const concurrent = await db
        .select()
        .from(erpRequestApprovals)
        .where(
          and(eq(erpRequestApprovals.id, approvalId), eq(erpRequestApprovals.schoolId, schoolId))
        )
        .limit(1);
      const finalRequest = concurrent[0] ?? request;
      const votersMap = await loadVoters([approvalId]);
      res.status(200).json(
        successResponse({
          request: { ...finalRequest, voters: votersMap.get(approvalId) ?? [] },
          approveCount,
          refuseCount,
        })
      );
      return;
    }
    const finalRequest = updated[0];

    if (request.requestType === "time_off") {
      await db
        .update(erpTimeOffRequests)
        .set({
          status: nextStatus,
          decidedBy: voterUserId,
          decidedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(erpTimeOffRequests.id, request.requestId),
            eq(erpTimeOffRequests.schoolId, schoolId)
          )
        );
    } else if (request.requestType === "expense") {
      await db
        .update(erpExpenses)
        .set({
          status: nextStatus === "approved" ? "approved" : "rejected",
          updatedAt: now,
        })
        .where(and(eq(erpExpenses.id, request.requestId), eq(erpExpenses.schoolId, schoolId)));
    }

    const votersMap = await loadVoters([approvalId]);
    res.status(200).json(
      successResponse({
        request: { ...finalRequest, voters: votersMap.get(approvalId) ?? [] },
        approveCount,
        refuseCount,
      })
    );
  }
);

// GET /stats — request approvals grouped by status
erpApprovalsRouter.get("/stats", requireSession, erpGuard("APPROVALS_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const rows = await db
    .select({ status: erpRequestApprovals.status, count: count() })
    .from(erpRequestApprovals)
    .where(eq(erpRequestApprovals.schoolId, schoolId))
    .groupBy(erpRequestApprovals.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    byStatus[row.status] = Number(row.count);
    total += Number(row.count);
  }

  res.status(200).json(successResponse({ byStatus, total }));
});
