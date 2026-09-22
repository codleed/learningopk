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

// ---------------------------------------------------------------------------
// Fee structures (per class/term price list — Gauzy product/price analog)
// ---------------------------------------------------------------------------

export const erpFeeStructures = pgTable(
  "erp_fee_structures",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Optional scoping: null class/term = applies to all
    classLevel: text("class_level"),
    termId: integer("term_id"),
    currency: text("currency").notNull().default("PKR"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_fee_structures_school_name_idx").on(table.schoolId, table.name),
    index("erp_fee_structures_school_active_idx").on(table.schoolId, table.isActive),
  ]
);

export const erpFeeComponents = pgTable(
  "erp_fee_components",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    feeStructureId: integer("fee_structure_id")
      .notNull()
      .references(() => erpFeeStructures.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // tuition, transport, lab, library, exam
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    isOptional: boolean("is_optional").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("erp_fee_components_structure_idx").on(table.feeStructureId)]
);

// ---------------------------------------------------------------------------
// Invoices (Gauzy invoice model: status lifecycle + line items) — student fees
// ---------------------------------------------------------------------------

export const erpInvoices = pgTable(
  "erp_invoices",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    // Student (user) the invoice is billed to
    studentUserId: text("student_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    feeStructureId: integer("fee_structure_id").references(() => erpFeeStructures.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("draft"), // draft|sent|viewed|partially_paid|paid|void|overdue
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    currency: text("currency").notNull().default("PKR"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdBy: text("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_invoices_school_number_idx").on(table.schoolId, table.invoiceNumber),
    index("erp_invoices_school_status_idx").on(table.schoolId, table.status),
    index("erp_invoices_student_idx").on(table.studentUserId, table.status),
    index("erp_invoices_school_due_idx").on(table.schoolId, table.dueDate),
  ]
);

export const erpInvoiceItems = pgTable(
  "erp_invoice_items",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => erpInvoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("erp_invoice_items_invoice_idx").on(table.invoiceId)]
);

// ---------------------------------------------------------------------------
// Payments (partial payments supported, Gauzy payment model)
// ---------------------------------------------------------------------------

export const erpPayments = pgTable(
  "erp_payments",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => erpInvoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("PKR"),
    method: text("method").notNull().default("cash"), // cash|bank_transfer|cheque|card|online
    reference: text("reference"), // bank ref / cheque number
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    notes: text("notes"),
    recordedBy: text("recorded_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("erp_payments_invoice_idx").on(table.invoiceId),
    index("erp_payments_school_paid_idx").on(table.schoolId, table.paidAt),
  ]
);
