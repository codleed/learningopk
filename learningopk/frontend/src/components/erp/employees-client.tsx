"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useErp } from "@/components/erp/erp-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  createErpEmployee,
  ErpApiError,
  erpKeys,
  getErpDepartments,
  getErpEmployees,
} from "@/lib/erp-api";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
] as const;

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

const PAGE_SIZE = 20;

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function errorMessage(error: unknown): string {
  if (error instanceof ErpApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function EmployeesClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addDialogKey, setAddDialogKey] = useState(0);

  const canView = hasPermission("EMPLOYEES_VIEW");
  const canManage = hasPermission("EMPLOYEES_MANAGE");

  const departmentsQuery = useQuery({
    queryKey: erpKeys.departments(schoolId ?? 0),
    queryFn: () => getErpDepartments(schoolId!),
    enabled: Boolean(schoolId) && canView,
  });

  const employeesQuery = useQuery({
    queryKey: erpKeys.employees(schoolId ?? 0, { search, departmentId, page }),
    queryFn: () =>
      getErpEmployees(schoolId!, {
        search: search || undefined,
        departmentId: departmentId === "" ? undefined : departmentId,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: Boolean(schoolId) && canView,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      workEmail?: string;
      phone?: string;
      departmentId?: number;
      employmentType?: string;
      joinedAt?: string;
    }) => createErpEmployee(schoolId!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  if (!schoolId) return null;

  if (!canView) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include employee viewing for this school."
      />
    );
  }

  const employees = employeesQuery.data?.items ?? [];
  const total = employeesQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const departments = departmentsQuery.data?.departments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-text-secondary">
            {total} employee{total === 1 ? "" : "s"} in {activeSchool?.name}
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              createMutation.reset();
              setAddOpen(true);
            }}
          >
            Add Employee
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <div className="w-64">
            <Input
              label="Search"
              placeholder="Name or employee code"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="w-56">
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Department</label>
          <Select
            value={departmentId}
            onChange={(event) => {
              setPage(1);
              setDepartmentId(event.target.value === "" ? "" : Number(event.target.value));
            }}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {employeesQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : employeesQuery.isError ? (
        <EmptyState
          title="Failed to load employees"
          description={errorMessage(employeesQuery.error)}
        />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees"
          description={
            search || departmentId !== ""
              ? "No employees match these filters."
              : "Add your first employee to get started."
          }
          action={
            canManage && !search && departmentId === "" ? (
              <Button
                onClick={() => {
                  createMutation.reset();
                  setAddOpen(true);
                }}
              >
                Add Employee
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Employment</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-border last:border-0 hover:bg-bg-subtle"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-text-secondary">{employee.employeeCode}</div>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {employee.departmentName ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {EMPLOYMENT_TYPE_LABELS[employee.employmentType] ??
                        formatLabel(employee.employmentType)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{employee.joinedAt ?? "—"}</td>
                    <td className="px-5 py-3">
                      {employee.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
          {pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
              <span className="text-text-secondary">
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
                {employeesQuery.isPlaceholderData ? <Spinner size="sm" /> : null}
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {canManage ? (
        <AddEmployeeDialog
          key={addDialogKey}
          open={addOpen}
          onOpenChange={setAddOpen}
          departments={departments}
          isMutating={createMutation.isPending}
          mutationError={createMutation.error ? errorMessage(createMutation.error) : null}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => {
                setAddOpen(false);
                setAddDialogKey((current) => current + 1);
              },
            });
          }}
        />
      ) : null}
    </div>
  );
}

function AddEmployeeDialog({
  open,
  onOpenChange,
  departments,
  isMutating,
  mutationError,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: number; name: string }[];
  isMutating: boolean;
  mutationError: string | null;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    workEmail?: string;
    phone?: string;
    departmentId?: number;
    employmentType?: string;
    joinedAt?: string;
  }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [employmentType, setEmploymentType] = useState<string>("full_time");
  const [joinedAt, setJoinedAt] = useState("");

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      workEmail: workEmail.trim() || undefined,
      phone: phone.trim() || undefined,
      departmentId: departmentId === "" ? undefined : departmentId,
      employmentType,
      joinedAt: joinedAt || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add Employee</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Ayesha"
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Khan"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Work email"
            type="email"
            value={workEmail}
            onChange={(event) => setWorkEmail(event.target.value)}
            placeholder="ayesha@school.edu.pk"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+92 300 0000000"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Department</label>
            <Select
              value={departmentId}
              onChange={(event) =>
                setDepartmentId(event.target.value === "" ? "" : Number(event.target.value))
              }
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Employment type
            </label>
            <Select
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value)}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Input
          label="Joined date"
          type="date"
          value={joinedAt}
          onChange={(event) => setJoinedAt(event.target.value)}
        />
        {mutationError ? (
          <p className="text-sm text-accent-danger" role="alert">
            {mutationError}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isMutating}
          disabled={!firstName.trim() || !lastName.trim()}
        >
          Add Employee
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
