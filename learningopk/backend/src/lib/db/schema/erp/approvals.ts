import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { schools, users } from "../../schema.js";
import { erpEmployees } from "./hrm.js";

// ---------------------------------------------------------------------------
// Generic approvals engine (Gauzy approval-policy + request-approval).
// requestType/requestId is polymorphic: time_off | expense | fee_waiver | custom.
// Quorum: request is approved when `minApprovals` distinct voters approve;
// refused as soon as any required approver refuses.
// ---------------------------------------------------------------------------

export const erpApprovalPolicies = pgTable(
  "erp_approval_policies",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    requestType: text("request_type").notNull(), // time_off | expense | fee_waiver | custom
    description: text("description"),
    minApprovals: integer("min_approvals").notNull().default(1),
    // Which employees can vote. Empty = anyone with APPROVALS_ACT permission.
    approverEmployeeIds: integer("approver_employee_ids").array(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_approval_policies_school_type_idx").on(table.schoolId, table.requestType),
    index("erp_approval_policies_school_active_idx").on(table.schoolId, table.isActive),
  ]
);

export const erpRequestApprovals = pgTable(
  "erp_request_approvals",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    policyId: integer("policy_id").references(() => erpApprovalPolicies.id, {
      onDelete: "set null",
    }),
    requestType: text("request_type").notNull(), // time_off | expense | fee_waiver | custom
    requestId: integer("request_id").notNull(), // polymorphic FK into the request table
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("requested"), // requested | approved | refused
    minApprovals: integer("min_approvals").notNull().default(1),
    requestedByEmployeeId: integer("requested_by_employee_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    requestedByUserId: text("requested_by_user_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_request_approvals_unique_idx").on(
      table.schoolId,
      table.requestType,
      table.requestId
    ),
    index("erp_request_approvals_school_status_idx").on(table.schoolId, table.status),
    index("erp_request_approvals_request_idx").on(table.requestType, table.requestId),
  ]
);

export const erpRequestApprovalVoters = pgTable(
  "erp_request_approval_voters",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    requestApprovalId: integer("request_approval_id")
      .notNull()
      .references(() => erpRequestApprovals.id, { onDelete: "cascade" }),
    voterUserId: text("voter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: text("vote").notNull(), // approve | refuse
    comment: text("comment"),
    votedAt: timestamp("voted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_request_approval_voters_unique_idx").on(
      table.requestApprovalId,
      table.voterUserId
    ),
    index("erp_request_approval_voters_approval_idx").on(table.requestApprovalId),
  ]
);
