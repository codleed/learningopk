"use client";

import { useQuery } from "@tanstack/react-query";

import { useErp } from "@/components/erp/erp-provider";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { getErpDashboard } from "@/lib/erp-api";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-2xl font-bold text-accent-primary">{value}</div>
        <div className="text-sm text-text-secondary">{label}</div>
        {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
      </CardBody>
    </Card>
  );
}

export function ErpDashboardClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;

  const dashboardQuery = useQuery({
    queryKey: ["erp", "dashboard", schoolId],
    queryFn: () => getErpDashboard(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("DASHBOARD_VIEW"),
  });

  if (!schoolId) return null;

  if (!hasPermission("DASHBOARD_VIEW")) {
    return (
      <EmptyState
        title="No dashboard access"
        description="Your role does not include dashboard viewing for this school."
      />
    );
  }

  if (dashboardQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <EmptyState
        title="Failed to load dashboard"
        description={
          dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unknown error"
        }
      />
    );
  }

  const data = dashboardQuery.data;
  const attendanceMap = new Map(data.attendance.byStatus.map((s) => [s.status, s.count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{activeSchool.name}</h1>
        <p className="text-sm text-text-secondary">School management overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Students"
          value={String(data.students.activeCount)}
          hint="Current enrollments"
        />
        <StatCard label="Active Employees" value={String(data.employees.activeCount)} />
        <StatCard
          label="Fees Outstanding"
          value={`Rs ${data.finance.outstanding.toLocaleString()}`}
          hint={`${data.finance.overdueCount} overdue invoices`}
        />
        <StatCard
          label="Collected This Month"
          value={`Rs ${data.finance.collectedThisMonth.toLocaleString()}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Classes by Enrollment</CardTitle>
          </CardHeader>
          <CardBody>
            {data.students.topClasses.length === 0 ? (
              <p className="text-sm text-text-secondary">No enrollments yet.</p>
            ) : (
              <div className="space-y-2">
                {data.students.topClasses.map((cls) => (
                  <div key={cls.classId} className="flex items-center justify-between text-sm">
                    <span>{cls.name}</span>
                    <Badge variant="neutral">{cls.count} students</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardBody>
            {data.employees.byDepartment.length === 0 ? (
              <p className="text-sm text-text-secondary">No employees yet.</p>
            ) : (
              <div className="space-y-2">
                {data.employees.byDepartment.map((dept) => (
                  <div
                    key={dept.departmentId ?? "none"}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{dept.name ?? "Unassigned"}</span>
                    <Badge variant="neutral">{dept.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Attendance
              {data.attendance.date ? (
                <span className="ml-2 text-xs font-normal text-text-secondary">
                  {data.attendance.date}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {data.attendance.byStatus.length === 0 ? (
              <p className="text-sm text-text-secondary">No attendance recorded yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-lg font-bold text-green-500">
                    {attendanceMap.get("present") ?? 0}
                  </div>
                  <div className="text-xs text-text-secondary">Present</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">
                    {attendanceMap.get("absent") ?? 0}
                  </div>
                  <div className="text-xs text-text-secondary">Absent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-500">
                    {attendanceMap.get("late") ?? 0}
                  </div>
                  <div className="text-xs text-text-secondary">Late</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admissions & Approvals</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-lg font-bold">{data.crm.openDeals}</div>
                <div className="text-xs text-text-secondary">Open pipeline deals</div>
              </div>
              <div>
                <div className="text-lg font-bold">
                  Rs {data.crm.openDealsValue.toLocaleString()}
                </div>
                <div className="text-xs text-text-secondary">Pipeline value</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-500">{data.pendingApprovals}</div>
                <div className="text-xs text-text-secondary">Pending approvals</div>
              </div>
            </div>
            {data.payroll ? (
              <div className="mt-4 border-t border-border pt-3 text-sm">
                <span className="text-text-secondary">Last payroll:</span>{" "}
                {data.payroll.payslipCount} payslips · Rs{" "}
                {data.payroll.totalNetPay.toLocaleString()} net ({data.payroll.periodStart} →{" "}
                {data.payroll.periodEnd})
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
