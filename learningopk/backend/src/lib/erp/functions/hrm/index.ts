/**
 * HRM Function Registry
 *
 * Pure async functions for HRM operations. Each function:
 * - Accepts typed parameters (no Express req/res)
 * - Returns plain data (no HTTP responses)
 * - Throws typed errors for validation/not-found/conflict cases
 * - Handles its own database transactions
 */

// Re-export shared types
export {
  type HrmFunctionContext,
  HrmError,
  requirePermission,
  type PaginationParams,
  type PaginatedResult,
  normalizePagination,
  type HrmFunction,
  registerHrmFunction,
} from "./types.js";

// Re-export entity-specific types
export type { Department, DepartmentInput, DepartmentListResult } from "./departments.js";

export type {
  Position,
  PositionInput,
  PositionListResult,
  PositionWithDepartment,
} from "./positions.js";

export type {
  Employee,
  EmployeeInput,
  EmployeeUpdateInput,
  EmployeeListParams,
  EmployeeListResult,
  EmployeeWithRelations,
  SalaryStructure,
  SalaryStructureInput,
} from "./employees.js";

export type { Team, TeamInput, TeamMemberInput, TeamWithMembers } from "./teams.js";

export type {
  AttendanceRecord,
  AttendanceInput,
  AttendanceBulkInput,
  AttendanceListParams,
  AttendanceListResult,
} from "./attendance.js";

export type {
  TimeOffPolicy,
  TimeOffPolicyInput,
  TimeOffRequest,
  TimeOffRequestInput,
  TimeOffDecideInput,
  TimeOffListParams,
  TimeOffListResult,
  Holiday,
  HolidayInput,
} from "./timeOff.js";

export type {
  PayrollRun,
  PayrollRunInput,
  PayrollRunWithStats,
  Payslip,
  PayslipWithEmployee,
} from "./payroll.js";

export type {
  Expense,
  ExpenseInput,
  ExpenseStatusInput,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseListParams,
  ExpenseListResult,
} from "./expenses.js";

// ============================================================================
// Function Registry Types (defined locally to avoid circular imports)
// ============================================================================

import type { ErpPermission } from "@learningopk/shared";
import type { HrmFunction, PaginationParams } from "./types.js";
import type { Department, DepartmentInput, DepartmentListResult } from "./departments.js";
import type {
  Position,
  PositionInput,
  PositionListResult,
  PositionWithDepartment,
} from "./positions.js";
import type {
  Employee,
  EmployeeInput,
  EmployeeUpdateInput,
  EmployeeListParams,
  EmployeeListResult,
  EmployeeWithRelations,
  SalaryStructure,
  SalaryStructureInput,
} from "./employees.js";
import type { Team, TeamInput, TeamMemberInput, TeamWithMembers } from "./teams.js";
import type {
  AttendanceRecord,
  AttendanceInput,
  AttendanceBulkInput,
  AttendanceListParams,
  AttendanceListResult,
} from "./attendance.js";
import type {
  TimeOffPolicy,
  TimeOffPolicyInput,
  TimeOffRequest,
  TimeOffRequestInput,
  TimeOffDecideInput,
  TimeOffListParams,
  TimeOffListResult,
  Holiday,
  HolidayInput,
} from "./timeOff.js";
import type {
  PayrollRun,
  PayrollRunInput,
  PayrollRunWithStats,
  Payslip,
  PayslipWithEmployee,
} from "./payroll.js";
import type {
  Expense,
  ExpenseInput,
  ExpenseStatusInput,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseListParams,
  ExpenseListResult,
} from "./expenses.js";

export interface HrmFunctions {
  // Departments
  listDepartments: HrmFunction<PaginationParams, DepartmentListResult>;
  createDepartment: HrmFunction<DepartmentInput, Department>;
  deleteDepartment: HrmFunction<{ id: number }, { deleted: true }>;

  // Positions
  listPositions: HrmFunction<PaginationParams & { departmentId?: number }, PositionListResult>;
  createPosition: HrmFunction<PositionInput, Position>;
  deletePosition: HrmFunction<{ id: number }, { deleted: true }>;

  // Employees
  listEmployees: HrmFunction<EmployeeListParams, EmployeeListResult>;
  createEmployee: HrmFunction<EmployeeInput, Employee>;
  getEmployee: HrmFunction<{ id: number }, EmployeeWithRelations>;
  updateEmployee: HrmFunction<{ id: number } & EmployeeUpdateInput, Employee>;
  deleteEmployee: HrmFunction<{ id: number }, { deleted: true }>;

  // Salary Structures
  createSalaryStructure: HrmFunction<
    { employeeId: number } & SalaryStructureInput,
    SalaryStructure
  >;

  // Teams
  listTeams: HrmFunction<PaginationParams, { teams: TeamWithMembers[] }>;
  createTeam: HrmFunction<TeamInput, Team>;
  updateTeamMembers: HrmFunction<
    { teamId: number; members: TeamMemberInput[] },
    { members: number; updated: true }
  >;
  deleteTeam: HrmFunction<{ id: number }, { deleted: true }>;

  // Attendance
  listAttendance: HrmFunction<AttendanceListParams, AttendanceListResult>;
  upsertAttendance: HrmFunction<AttendanceInput, AttendanceRecord>;
  bulkUpsertAttendance: HrmFunction<AttendanceBulkInput, { upserted: number }>;

  // Time Off Policies
  listTimeOffPolicies: HrmFunction<{}, { policies: TimeOffPolicy[] }>;
  createTimeOffPolicy: HrmFunction<TimeOffPolicyInput, TimeOffPolicy>;

  // Time Off Requests
  listTimeOffRequests: HrmFunction<TimeOffListParams, TimeOffListResult>;
  createTimeOffRequest: HrmFunction<TimeOffRequestInput, TimeOffRequest>;
  decideTimeOffRequest: HrmFunction<{ requestId: number } & TimeOffDecideInput, TimeOffRequest>;

  // Official Holidays
  listHolidays: HrmFunction<{}, { holidays: Holiday[] }>;
  createHoliday: HrmFunction<HolidayInput, Holiday>;
  deleteHoliday: HrmFunction<{ id: number }, { deleted: true }>;

  // Payroll
  listPayrollRuns: HrmFunction<
    PaginationParams,
    { runs: PayrollRunWithStats[]; total: number; page: number; pageSize: number }
  >;
  createPayrollRun: HrmFunction<PayrollRunInput, { run: PayrollRun; payslipCount: number }>;
  getPayrollRun: HrmFunction<{ id: number }, { run: PayrollRun; payslips: PayslipWithEmployee[] }>;

  // Expenses
  listExpenses: HrmFunction<ExpenseListParams, ExpenseListResult>;
  createExpense: HrmFunction<ExpenseInput, Expense>;
  updateExpenseStatus: HrmFunction<{ expenseId: number } & ExpenseStatusInput, Expense>;

  // Expense Categories
  listExpenseCategories: HrmFunction<{}, { categories: ExpenseCategory[] }>;
  createExpenseCategory: HrmFunction<ExpenseCategoryInput, ExpenseCategory>;
  deleteExpenseCategory: HrmFunction<{ id: number }, { deleted: true }>;
}

export const hrmFunctions: Partial<HrmFunctions> = {};
