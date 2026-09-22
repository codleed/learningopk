import {
  boolean,
  date,
  index,
  integer,
  numeric,
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
// Contacts (Gauzy organization-contact: one entity for LEAD / CLIENT / VENDOR)
// ---------------------------------------------------------------------------

export const erpContacts = pgTable(
  "erp_contacts",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    contactType: text("contact_type").notNull().default("lead"), // lead | client | vendor
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    // For a school CRM the contact is usually a parent/guardian
    studentName: text("student_name"),
    studentGrade: text("student_grade"),
    source: text("source"), // website | walk_in | referral | campaign | other
    budget: numeric("budget", { precision: 12, scale: 2 }),
    notes: text("notes"),
    ownerId: integer("owner_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("erp_contacts_school_type_idx").on(table.schoolId, table.contactType),
    index("erp_contacts_school_created_idx").on(table.schoolId, table.createdAt),
    index("erp_contacts_owner_idx").on(table.ownerId),
  ]
);

// ---------------------------------------------------------------------------
// Pipelines & deals (Gauzy pipeline / pipeline-stage / deal) — admissions funnel
// ---------------------------------------------------------------------------

export const erpPipelines = pgTable(
  "erp_pipelines",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_pipelines_school_name_idx").on(table.schoolId, table.name)]
);

export const erpPipelineStages = pgTable(
  "erp_pipeline_stages",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    pipelineId: integer("pipeline_id")
      .notNull()
      .references(() => erpPipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_pipeline_stages_pipeline_name_idx").on(table.pipelineId, table.name),
    index("erp_pipeline_stages_pipeline_position_idx").on(table.pipelineId, table.position),
  ]
);

export const erpDeals = pgTable(
  "erp_deals",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    pipelineId: integer("pipeline_id")
      .notNull()
      .references(() => erpPipelines.id, { onDelete: "cascade" }),
    stageId: integer("stage_id")
      .notNull()
      .references(() => erpPipelineStages.id, { onDelete: "cascade" }),
    contactId: integer("contact_id").references(() => erpContacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
    probability: integer("probability").notNull().default(0),
    expectedCloseDate: date("expected_close_date"),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    notes: text("notes"),
    ownerId: integer("owner_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("erp_deals_pipeline_stage_idx").on(table.pipelineId, table.stageId),
    index("erp_deals_school_created_idx").on(table.schoolId, table.createdAt),
  ]
);
