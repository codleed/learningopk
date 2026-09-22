/**
 * Payroll Functions
 */

import { and, asc, count, desc, eq, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import {
  erpEmployees,
  erpPayslips,
  erpPayrollRuns,
  erpSalaryStructures,
} from "../../../db/schema/erp/hrm.js";
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

export const payrollRunBodySchema = z.object({
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  notes: z.string().max(2000).nullable().optional(),
});

export type PayrollRunInput = z.infer<typeof payrollRunBodySchema>;

export interface PayrollRun {
  id: number;
  schoolId: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRunWithStats extends PayrollRun {
  payslipCount: number;
  totalNetPay: number;
}

export interface Payslip {
  id: number;
  schoolId: number;
  payrollRunId: number;
  employeeId: number;
  basicSalary: string;
  allowances: string;
  deductions: string;
  netPay: string;
  breakdown: Record<string, number>;
  createdAt: Date;
}

export interface PayslipWithEmployee extends Payslip {
  employeeName: string;
  employeeCode: string;
}

// ============================================================================
// Helpers
// ============================================================================

const money = (value: number): string => value.toFixed(2);
const toNumber = (value: string | number | null): number =>
  value === null ? 0 : typeof value === "number" ? value : Number.parseFloat(value) || 0;

// ============================================================================
// Functions
// ============================================================================

async function listPayrollRuns(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<{ runs: PayrollRunWithStats[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize } = normalizePagination(params);
  const offset = (page - 1) * pageSize;

  const [runs, stats] = await Promise.all([
    db
      .select()
      .from(erpPayrollRuns)
      .where(eq(erpPayrollRuns.schoolId, context.schoolId))
      .orderBy(desc(erpPayrollRuns.periodStart), desc(erpPayrollRuns.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({
        payrollRunId: erpPayslips.payrollRunId,
        payslipCount: count(),
        totalNetPay: sum(erpPayslips.netPay),
      })
      .from(erpPayslips)
      .where(eq(erpPayslips.schoolId, context.schoolId))
      .groupBy(erpPayslips.payrollRunId),
  ]);

  const statsByRun = new Map(stats.map((row) => [row.payrollRunId, row]));

  const items = runs.map((run) => {
    const stat = statsByRun.get(run.id);
    return {
      ...run,
      payslipCount: Number(stat?.payslipCount ?? 0),
      totalNetPay: Number(stat?.totalNetPay ?? 0),
    };
  });

  const totalRows = await db
    .select({ value: count() })
    .from(erpPayrollRuns)
    .where(eq(erpPayrollRuns.schoolId, context.schoolId));
  const total = Number(totalRows[0]?.value ?? 0);

  return {
    runs: items as PayrollRunWithStats[],
    total,
    page,
    pageSize,
  };
}

async function createPayrollRun(
  context: HrmFunctionContext,
  input: PayrollRunInput
): Promise<{ run: PayrollRun; payslipCount: number }> {
  const parsed = payrollRunBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid payroll run", parsed.error.flatten());
  }
  const { periodStart, periodEnd, notes } = parsed.data;

  if (periodStart > periodEnd) {
    throw HrmError.validation("Period start must not be after period end", {
      code: "INVALID_DATE_RANGE",
    });
  }

  const existing = await db
    .select({ id: erpPayrollRuns.id })
    .from(erpPayrollRuns)
    .where(
      and(
        eq(erpPayrollRuns.schoolId, context.schoolId),
        eq(erpPayrollRuns.periodStart, periodStart),
        eq(erpPayrollRuns.periodEnd, periodEnd)
      )
    )
    .limit(1);
  if (existing[0]) {
    throw HrmError.conflict("Payroll run", "period");
  }

  const result = await db.transaction(async (tx) => {
    const insertedRun = await tx
      .insert(erpPayrollRuns)
      .values({
        schoolId: context.schoolId,
        periodStart,
        periodEnd,
        status: "draft",
        notes: notes ?? null,
      })
      .returning();
    const run = insertedRun[0]!;

    const structureRows = await tx
      .select({
        id: erpSalaryStructures.id,
        employeeId: erpSalaryStructures.employeeId,
        basicSalary: erpSalaryStructures.basicSalary,
        components: erpSalaryStructures.components,
        effectiveFrom: erpSalaryStructures.effectiveFrom,
      })
      .from(erpSalaryStructures)
      .innerJoin(
        erpEmployees,
        and(
          eq(erpEmployees.id, erpSalaryStructures.employeeId),
          eq(erpEmployees.schoolId, context.schoolId),
          eq(erpEmployees.isActive, true)
        )
      )
      .where(
        and(
          eq(erpSalaryStructures.schoolId, context.schoolId),
          eq(erpSalaryStructures.isActive, true)
        )
      );

    const latestByEmployee = new Map<
      number,
      { id: number; basicSalary: string; components: Record<string, number>; effectiveFrom: string }
    >();
    for (const row of structureRows) {
      const current = latestByEmployee.get(row.employeeId);
      if (
        !current ||
        row.effectiveFrom > current.effectiveFrom ||
        (row.effectiveFrom === current.effectiveFrom && row.id > current.id)
      ) {
        latestByEmployee.set(row.employeeId, row);
      }
    }

    const payslipValues = [...latestByEmployee.entries()].map(([employeeId, structure]) => {
      const basic = Number(structure.basicSalary);
      let allowances = 0;
      let deductions = 0;
      for (const [key, value] of Object.entries(structure.components ?? {})) {
        const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
        if (key.startsWith("deduction:")) {
          deductions += amount;
        } else {
          allowances += amount;
        }
      }
      const netPay = basic + allowances - deductions;
      return {
        schoolId: context.schoolId,
        payrollRunId: run.id,
        employeeId,
        basicSalary: money(basic),
        allowances: money(allowances),
        deductions: money(deductions),
        netPay: money(netPay),
        breakdown: structure.components ?? {},
      };
    });

    if (payslipValues.length > 0) {
      await tx.insert(erpPayslips).values(payslipValues);
    }

    const updatedRun = await tx
      .update(erpPayrollRuns)
      .set({ status: "approved", updatedAt: new Date() })
      .where(and(eq(erpPayrollRuns.id, run.id), eq(erpPayrollRuns.schoolId, context.schoolId)))
      .returning();

    return { run: updatedRun[0] ?? run, payslipCount: payslipValues.length };
  });

  return { run: result.run as PayrollRun, payslipCount: result.payslipCount };
}

async function getPayrollRun(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ run: PayrollRun; payslips: PayslipWithEmployee[] }> {
  const runRows = await db
    .select()
    .from(erpPayrollRuns)
    .where(and(eq(erpPayrollRuns.id, args.id), eq(erpPayrollRuns.schoolId, context.schoolId)))
    .limit(1);
  const run = runRows[0];
  if (!run) {
    throw HrmError.notFound("Payroll run", args.id);
  }

  const payslips = await db
    .select({
      id: erpPayslips.id,
      employeeId: erpPayslips.employeeId,
      employeeName: sql<string>`${erpEmployees.firstName} || ' ' || ${erpEmployees.lastName}`,
      employeeCode: erpEmployees.employeeCode,
      basicSalary: erpPayslips.basicSalary,
      allowances: erpPayslips.allowances,
      deductions: erpPayslips.deductions,
      netPay: erpPayslips.netPay,
      breakdown: erpPayslips.breakdown,
      createdAt: erpPayslips.createdAt,
    })
    .from(erpPayslips)
    .innerJoin(
      erpEmployees,
      and(eq(erpEmployees.id, erpPayslips.employeeId), eq(erpEmployees.schoolId, context.schoolId))
    )
    .where(and(eq(erpPayslips.payrollRunId, args.id), eq(erpPayslips.schoolId, context.schoolId)))
    .orderBy(asc(erpEmployees.employeeCode));

  return { run: run as PayrollRun, payslips: payslips as PayslipWithEmployee[] };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction(
  "listPayrollRuns",
  listPayrollRuns,
  "PAYROLL_VIEW",
  "List payroll runs with statistics"
);

registerHrmFunction(
  "createPayrollRun",
  createPayrollRun,
  "PAYROLL_MANAGE",
  "Create a new payroll run and generate payslips"
);

registerHrmFunction(
  "getPayrollRun",
  getPayrollRun,
  "PAYROLL_VIEW",
  "Get a payroll run with its payslips"
);
