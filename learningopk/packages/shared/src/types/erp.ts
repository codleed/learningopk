/**
 * ERP (school management) shared contracts — the Gauzy "packages/contracts"
 * pattern: a single dependency-free source of permission strings and enums
 * consumed by backend routes and frontend gating.
 */

export const ERP_PERMISSIONS = [
  // Core
  "ERP_ACCESS",
  "ROLES_VIEW",
  "ROLES_MANAGE",
  "TAGS_MANAGE",
  "INVITES_MANAGE",
  // HRM
  "EMPLOYEES_VIEW",
  "EMPLOYEES_MANAGE",
  "DEPARTMENTS_MANAGE",
  "TEAMS_MANAGE",
  "ATTENDANCE_VIEW",
  "ATTENDANCE_MANAGE",
  "TIME_OFF_VIEW",
  "TIME_OFF_REQUEST",
  "TIME_OFF_APPROVE",
  "PAYROLL_VIEW",
  "PAYROLL_MANAGE",
  "EXPENSES_VIEW",
  "EXPENSES_MANAGE",
  // CRM
  "CONTACTS_VIEW",
  "CONTACTS_MANAGE",
  "PIPELINES_VIEW",
  "PIPELINES_MANAGE",
  "DEALS_VIEW",
  "DEALS_MANAGE",
  // Finance
  "FEES_VIEW",
  "FEES_MANAGE",
  "INVOICES_VIEW",
  "INVOICES_MANAGE",
  "PAYMENTS_VIEW",
  "PAYMENTS_MANAGE",
  // Academics
  "CLASSES_VIEW",
  "CLASSES_MANAGE",
  "ENROLLMENTS_VIEW",
  "ENROLLMENTS_MANAGE",
  "TIMETABLE_VIEW",
  "TIMETABLE_MANAGE",
  "EXAMS_VIEW",
  "EXAMS_MANAGE",
  "GRADES_VIEW",
  "GRADES_MANAGE",
  // Approvals
  "APPROVAL_POLICIES_VIEW",
  "APPROVAL_POLICIES_MANAGE",
  "APPROVALS_VIEW",
  "APPROVALS_ACT",
  // Dashboards
  "DASHBOARD_VIEW",
] as const;

export type ErpPermission = (typeof ERP_PERMISSIONS)[number];

export const ERP_SYSTEM_ROLES = [
  {
    key: "erp_admin",
    name: "ERP Admin",
    description: "Full access to all school ERP modules",
    permissions: [...ERP_PERMISSIONS],
  },
  {
    key: "erp_teacher",
    name: "Teacher",
    description: "Academics-focused access",
    permissions: [
      "ERP_ACCESS",
      "EMPLOYEES_VIEW",
      "ATTENDANCE_VIEW",
      "ATTENDANCE_MANAGE",
      "CLASSES_VIEW",
      "TIMETABLE_VIEW",
      "EXAMS_VIEW",
      "EXAMS_MANAGE",
      "GRADES_VIEW",
      "GRADES_MANAGE",
      "TIME_OFF_VIEW",
      "TIME_OFF_REQUEST",
      "DASHBOARD_VIEW",
    ],
  },
  {
    key: "erp_staff",
    name: "Administrative Staff",
    description: "Front-office operations",
    permissions: [
      "ERP_ACCESS",
      "EMPLOYEES_VIEW",
      "CONTACTS_VIEW",
      "CONTACTS_MANAGE",
      "DEALS_VIEW",
      "FEES_VIEW",
      "FEES_MANAGE",
      "INVOICES_VIEW",
      "INVOICES_MANAGE",
      "PAYMENTS_VIEW",
      "DASHBOARD_VIEW",
      "CLASSES_VIEW",
      "ENROLLMENTS_VIEW",
      "ENROLLMENTS_MANAGE",
    ],
  },
  {
    key: "erp_finance",
    name: "Finance",
    description: "Fees, invoices, payroll",
    permissions: [
      "ERP_ACCESS",
      "FEES_VIEW",
      "FEES_MANAGE",
      "INVOICES_VIEW",
      "INVOICES_MANAGE",
      "PAYMENTS_VIEW",
      "PAYMENTS_MANAGE",
      "PAYROLL_VIEW",
      "PAYROLL_MANAGE",
      "EXPENSES_VIEW",
      "EXPENSES_MANAGE",
      "DASHBOARD_VIEW",
    ],
  },
  {
    key: "erp_viewer",
    name: "Viewer",
    description: "Read-only across modules",
    permissions: [
      "ERP_ACCESS",
      "EMPLOYEES_VIEW",
      "ATTENDANCE_VIEW",
      "CONTACTS_VIEW",
      "DEALS_VIEW",
      "FEES_VIEW",
      "INVOICES_VIEW",
      "PAYMENTS_VIEW",
      "CLASSES_VIEW",
      "ENROLLMENTS_VIEW",
      "TIMETABLE_VIEW",
      "EXAMS_VIEW",
      "GRADES_VIEW",
      "TIME_OFF_VIEW",
      "APPROVALS_VIEW",
      "DASHBOARD_VIEW",
    ],
  },
] as const;

export type ErpSystemRoleKey =
  "erp_admin" | "erp_teacher" | "erp_staff" | "erp_finance" | "erp_viewer";

export const ERP_CONTACT_TYPES = ["lead", "client", "vendor"] as const;
export type ErpContactType = (typeof ERP_CONTACT_TYPES)[number];

export const ERP_PIPELINE_ENTITY = "deal" as const;

export const ERP_DEAL_STAGES = ["inquiry", "applied", "interview", "offer", "enrolled"] as const;

export const ERP_INVOICE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "void",
  "overdue",
] as const;
export type ErpInvoiceStatus = (typeof ERP_INVOICE_STATUSES)[number];

export const ERP_PAYMENT_METHODS = ["cash", "bank_transfer", "cheque", "card", "online"] as const;
export type ErpPaymentMethod = (typeof ERP_PAYMENT_METHODS)[number];

export const ERP_ENROLLMENT_STATUSES = ["active", "graduated", "withdrawn", "suspended"] as const;
export type ErpEnrollmentStatus = (typeof ERP_ENROLLMENT_STATUSES)[number];

export const ERP_TIME_OFF_STATUSES = ["requested", "approved", "refused", "cancelled"] as const;
export type ErpTimeOffStatus = (typeof ERP_TIME_OFF_STATUSES)[number];

export const ERP_APPROVAL_STATUSES = ["requested", "approved", "refused"] as const;
export type ErpApprovalStatus = (typeof ERP_APPROVAL_STATUSES)[number];

export const ERP_REQUEST_APPROVAL_TYPES = ["time_off", "expense", "fee_waiver", "custom"] as const;
export type ErpRequestApprovalType = (typeof ERP_REQUEST_APPROVAL_TYPES)[number];

export const ERP_EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;

export const ERP_TAG_TARGET_TYPES = [
  "contact",
  "deal",
  "employee",
  "student",
  "expense",
  "invoice",
] as const;
export type ErpTagTargetType = (typeof ERP_TAG_TARGET_TYPES)[number];

export const ERP_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type ErpWeekday = (typeof ERP_WEEKDAYS)[number];

export function isErpPermission(value: string): value is ErpPermission {
  return (ERP_PERMISSIONS as readonly string[]).includes(value);
}
