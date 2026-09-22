import { and, count, desc, eq, gte, isNull, lt, ne, sql, sum } from "drizzle-orm";
import { Router } from "express";

import { db } from "../../lib/db/index.js";
import { erpRequestApprovals } from "../../lib/db/schema/erp/approvals.js";
import { erpContacts, erpDeals } from "../../lib/db/schema/erp/crm.js";
import { erpInvoices, erpPayments } from "../../lib/db/schema/erp/finance.js";
import {
  erpDepartments,
  erpEmployees,
  erpPayrollRuns,
  erpPayslips,
} from "../../lib/db/schema/erp/hrm.js";
import {
  erpEnrollments,
  erpSchoolClasses,
  erpStudentAttendance,
} from "../../lib/db/schema/erp/academics.js";
import { requireSession } from "../../lib/session.js";
import { successResponse } from "../../lib/response.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";

export const erpDashboardRouter = Router();

const toNum = (value: string | number | null): number =>
  value === null ? 0 : typeof value === "number" ? value : Number.parseFloat(value);

const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

// GET / — cross-module aggregate stats
erpDashboardRouter.get("/", requireSession, erpGuard("DASHBOARD_VIEW"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const now = new Date();
  const todayStr = localDateStr(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeEnrollmentCountRow] = await db
    .select({ value: count() })
    .from(erpEnrollments)
    .where(and(eq(erpEnrollments.schoolId, schoolId), eq(erpEnrollments.status, "active")));

  const studentsByClass = await db
    .select({
      classId: erpSchoolClasses.id,
      className: erpSchoolClasses.name,
      gradeLevel: erpSchoolClasses.gradeLevel,
      activeCount: count(),
    })
    .from(erpEnrollments)
    .innerJoin(erpSchoolClasses, eq(erpSchoolClasses.id, erpEnrollments.classId))
    .where(and(eq(erpEnrollments.schoolId, schoolId), eq(erpEnrollments.status, "active")))
    .groupBy(erpSchoolClasses.id, erpSchoolClasses.name, erpSchoolClasses.gradeLevel)
    .orderBy(desc(count()))
    .limit(5);

  const [activeEmployeeCountRow] = await db
    .select({ value: count() })
    .from(erpEmployees)
    .where(and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.isActive, true)));

  const employeesByDepartment = await db
    .select({
      departmentId: erpDepartments.id,
      departmentName: erpDepartments.name,
      activeCount: count(),
    })
    .from(erpEmployees)
    .leftJoin(erpDepartments, eq(erpDepartments.id, erpEmployees.departmentId))
    .where(and(eq(erpEmployees.schoolId, schoolId), eq(erpEmployees.isActive, true)))
    .groupBy(erpDepartments.id, erpDepartments.name)
    .orderBy(desc(count()));

  const [outstandingRow] = await db
    .select({
      outstanding: sql<
        string | null
      >`coalesce(sum(${erpInvoices.total} - ${erpInvoices.amountPaid}), 0)`,
    })
    .from(erpInvoices)
    .where(and(eq(erpInvoices.schoolId, schoolId), ne(erpInvoices.status, "void")));

  const [paymentsThisMonthRow] = await db
    .select({ value: sum(erpPayments.amount) })
    .from(erpPayments)
    .where(and(eq(erpPayments.schoolId, schoolId), gte(erpPayments.paidAt, monthStart)));

  const [overdueCountRow] = await db
    .select({ value: count() })
    .from(erpInvoices)
    .where(
      and(
        eq(erpInvoices.schoolId, schoolId),
        lt(erpInvoices.dueDate, todayStr),
        ne(erpInvoices.status, "paid"),
        ne(erpInvoices.status, "void")
      )
    );

  const [openDealsRow] = await db
    .select({
      value: count(),
      openValue: sql<string | null>`coalesce(sum(${erpDeals.value}), 0)`,
    })
    .from(erpDeals)
    .where(and(eq(erpDeals.schoolId, schoolId), isNull(erpDeals.closedAt)));

  const [newContactsThisMonthRow] = await db
    .select({ value: count() })
    .from(erpContacts)
    .where(and(eq(erpContacts.schoolId, schoolId), gte(erpContacts.createdAt, monthStart)));

  const [latestAttendanceDateRow] = await db
    .select({ latestDate: sql<string | null>`max(${erpStudentAttendance.attendanceDate})` })
    .from(erpStudentAttendance)
    .where(eq(erpStudentAttendance.schoolId, schoolId));

  const latestAttendanceDate = latestAttendanceDateRow?.latestDate ?? null;
  const attendanceByStatus = latestAttendanceDate
    ? await db
        .select({ status: erpStudentAttendance.status, value: count() })
        .from(erpStudentAttendance)
        .where(
          and(
            eq(erpStudentAttendance.schoolId, schoolId),
            eq(erpStudentAttendance.attendanceDate, latestAttendanceDate)
          )
        )
        .groupBy(erpStudentAttendance.status)
    : [];

  const [pendingApprovalsRow] = await db
    .select({ value: count() })
    .from(erpRequestApprovals)
    .where(
      and(eq(erpRequestApprovals.schoolId, schoolId), eq(erpRequestApprovals.status, "requested"))
    );

  const latestPayrollRuns = await db
    .select({
      id: erpPayrollRuns.id,
      periodStart: erpPayrollRuns.periodStart,
      periodEnd: erpPayrollRuns.periodEnd,
      status: erpPayrollRuns.status,
      payslipCount: count(erpPayslips.id),
      totalNetPay: sql<string | null>`coalesce(sum(${erpPayslips.netPay}), 0)`,
    })
    .from(erpPayrollRuns)
    .leftJoin(erpPayslips, eq(erpPayslips.payrollRunId, erpPayrollRuns.id))
    .where(eq(erpPayrollRuns.schoolId, schoolId))
    .groupBy(
      erpPayrollRuns.id,
      erpPayrollRuns.periodStart,
      erpPayrollRuns.periodEnd,
      erpPayrollRuns.status,
      erpPayrollRuns.createdAt
    )
    .orderBy(desc(erpPayrollRuns.createdAt))
    .limit(1);

  const latestRun = latestPayrollRuns[0] ?? null;
  const payroll =
    latestRun && latestRun.payslipCount > 0
      ? {
          runId: latestRun.id,
          periodStart: latestRun.periodStart,
          periodEnd: latestRun.periodEnd,
          status: latestRun.status,
          payslipCount: latestRun.payslipCount,
          totalNetPay: toNum(latestRun.totalNetPay),
        }
      : null;

  res.status(200).json(
    successResponse({
      students: {
        activeCount: activeEnrollmentCountRow?.value ?? 0,
        topClasses: studentsByClass.map((row) => ({
          classId: row.classId,
          name: row.className,
          count: row.activeCount,
        })),
      },
      employees: {
        activeCount: activeEmployeeCountRow?.value ?? 0,
        byDepartment: employeesByDepartment.map((row) => ({
          departmentId: row.departmentId,
          name: row.departmentName ?? "Unassigned",
          count: row.activeCount,
        })),
      },
      finance: {
        outstanding: toNum(outstandingRow?.outstanding ?? null),
        collectedThisMonth: toNum(paymentsThisMonthRow?.value ?? null),
        overdueCount: overdueCountRow?.value ?? 0,
      },
      crm: {
        openDeals: openDealsRow?.value ?? 0,
        openDealsValue: toNum(openDealsRow?.openValue ?? null),
        newContactsThisMonth: newContactsThisMonthRow?.value ?? 0,
      },
      attendance: {
        date: latestAttendanceDate,
        byStatus: attendanceByStatus.map((row) => ({
          status: row.status,
          count: row.value,
        })),
      },
      pendingApprovals: pendingApprovalsRow?.value ?? 0,
      payroll,
    })
  );
});
