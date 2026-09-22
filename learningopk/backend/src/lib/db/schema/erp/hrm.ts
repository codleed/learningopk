import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { schools, users } from "../../schema.js";
import { erpRoles } from "./core.js";

// ---------------------------------------------------------------------------
// Organization structure (Gauzy organization-department/position/employment-type)
// ---------------------------------------------------------------------------

export const erpDepartments = pgTable(
  "erp_departments",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_departments_school_name_idx").on(table.schoolId, table.name)]
);

export const erpPositions = pgTable(
  "erp_positions",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    departmentId: integer("department_id").references(() => erpDepartments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_positions_school_name_idx").on(table.schoolId, table.name)]
);

export const erpEmployees = pgTable(
  "erp_employees",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    employeeCode: text("employee_code").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    workEmail: text("work_email"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    departmentId: integer("department_id").references(() => erpDepartments.id, {
      onDelete: "set null",
    }),
    positionId: integer("position_id").references(() => erpPositions.id, {
      onDelete: "set null",
    }),
    employmentType: text("employment_type").notNull().default("full_time"),
    // joinedAt is employment start; startedWorkOn mirrors Gauzy
    joinedAt: date("joined_at"),
    endedAt: date("ended_at"),
    isActive: boolean("is_active").notNull().default(true),
    // Gauzy employee rates, adapted: salary is in salary structures
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_employees_school_code_idx").on(table.schoolId, table.employeeCode),
    index("erp_employees_school_active_idx").on(table.schoolId, table.isActive),
    index("erp_employees_user_idx").on(table.userId),
    index("erp_employees_department_idx").on(table.departmentId),
  ]
);

export const erpTeams = pgTable(
  "erp_teams",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_teams_school_name_idx").on(table.schoolId, table.name)]
);

export const erpTeamMembers = pgTable(
  "erp_team_members",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => erpTeams.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => erpEmployees.id, { onDelete: "cascade" }),
    isManager: boolean("is_manager").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (timeoff) => [
    uniqueIndex("erp_team_members_team_employee_idx").on(timeoff.teamId, timeoff.employeeId),
    index("erp_team_members_employee_idx").on(timeoff.employeeId),
  ]
);

// ---------------------------------------------------------------------------
// Staff attendance (Gauzy time-tracking, simplified to check-in/out)
// ---------------------------------------------------------------------------

export const erpAttendanceRecords = pgTable(
  "erp_attendance_records",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => erpEmployees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    checkIn: timestamp("check_in", { withTimezone: true, mode: "date" }),
    checkOut: timestamp("check_out", { withTimezone: true, mode: "date" }),
    status: text("status").notNull().default("present"), // present | absent | late | leave | half_day
    source: text("source").notNull().default("manual"), // manual | kiosk | import
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_attendance_employee_date_idx").on(table.employeeId, table.workDate),
    index("erp_attendance_school_date_idx").on(table.schoolId, table.workDate),
  ]
);

// ---------------------------------------------------------------------------
// Time off (Gauzy time-off-policy / time-off-request / holidays)
// ---------------------------------------------------------------------------

export const erpTimeOffPolicies = pgTable(
  "erp_time_off_policies",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    paid: boolean("paid").notNull().default(true),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    annualDays: integer("annual_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_time_off_policies_school_name_idx").on(table.schoolId, table.name)]
);

export const erpTimeOffRequests = pgTable(
  "erp_time_off_requests",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => erpEmployees.id, { onDelete: "cascade" }),
    policyId: integer("policy_id").references(() => erpTimeOffPolicies.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("requested"), // requested | approved | refused | cancelled
    reason: text("reason"),
    decidedBy: text("decided_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("erp_time_off_requests_school_status_idx").on(table.schoolId, table.status),
    index("erp_time_off_requests_employee_idx").on(table.employeeId),
  ]
);

export const erpOfficialHolidays = pgTable(
  "erp_official_holidays",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("erp_official_holidays_school_idx").on(table.schoolId, table.startDate)]
);

// ---------------------------------------------------------------------------
// Payroll (Gauzy payroll-item / payroll-run, simplified to salary structure +
// runs + payslips)
// ---------------------------------------------------------------------------

export const erpSalaryStructures = pgTable(
  "erp_salary_structures",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => erpEmployees.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("PKR"),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
    // jsonb map of component name -> amount (allowances/deductions)
    components: jsonb("components").$type<Record<string, number>>().notNull().default({}),
    effectiveFrom: date("effective_from").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("erp_salary_structures_employee_idx").on(table.employeeId, table.isActive)]
);

export const erpPayrollRuns = pgTable(
  "erp_payroll_runs",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: text("status").notNull().default("draft"), // draft | processing | approved | paid
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("erp_payroll_runs_school_period_idx").on(
      table.schoolId,
      table.periodStart,
      table.periodEnd
    ),
  ]
);

export const erpPayslips = pgTable(
  "erp_payslips",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    payrollRunId: integer("payroll_run_id")
      .notNull()
      .references(() => erpPayrollRuns.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => erpEmployees.id, { onDelete: "cascade" }),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
    allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull().default("0"),
    deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
    netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, number>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_payslips_run_employee_idx").on(table.payrollRunId, table.employeeId)]
);

// ---------------------------------------------------------------------------
// Expenses (Gauzy expense / expense-categories / vendors)
// ---------------------------------------------------------------------------

export const erpExpenseCategories = pgTable(
  "erp_expense_categories",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("erp_expense_categories_school_name_idx").on(table.schoolId, table.name)]
);

export const erpExpenses = pgTable(
  "erp_expenses",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => erpExpenseCategories.id, {
      onDelete: "set null",
    }),
    employeeId: integer("employee_id").references(() => erpEmployees.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("PKR"),
    spentAt: date("spent_at").notNull(),
    status: text("status").notNull().default("submitted"), // submitted | approved | rejected | reimbursed
    notes: text("notes"),
    createdBy: text("created_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("erp_expenses_school_spent_idx").on(table.schoolId, table.spentAt),
    index("erp_expenses_status_idx").on(table.schoolId, table.status),
  ]
);
