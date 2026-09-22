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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TabList, TabTrigger, Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createErpTimeOffRequest,
  decideErpTimeOffRequest,
  ErpApiError,
  erpKeys,
  getErpEmployees,
  getErpTimeOffPolicies,
  getErpTimeOffRequests,
} from "@/lib/erp-api";

const STATUS_TABS = [
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "refused", label: "Refused" },
] as const;

const STATUS_BADGES: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  requested: "warning",
  refused: "danger",
  cancelled: "neutral",
};

const PAGE_SIZE = 20;

function errorMessage(error: unknown): string {
  if (error instanceof ErpApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function TimeOffClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>("requested");
  const [page, setPage] = useState(1);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDialogKey, setRequestDialogKey] = useState(0);

  const canView = hasPermission("TIME_OFF_VIEW");
  const canRequest = hasPermission("TIME_OFF_REQUEST");
  const canApprove = hasPermission("TIME_OFF_APPROVE");

  const requestsQuery = useQuery({
    queryKey: erpKeys.timeOff(schoolId ?? 0, { status, page }),
    queryFn: () => getErpTimeOffRequests(schoolId!, status),
    enabled: Boolean(schoolId) && canView,
    placeholderData: keepPreviousData,
  });

  const decideMutation = useMutation({
    mutationFn: (data: { requestId: number; decision: "approved" | "refused" }) =>
      decideErpTimeOffRequest(schoolId!, data.requestId, data.decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  if (!schoolId) return null;

  if (!canView) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include time off viewing for this school."
      />
    );
  }

  const requests = requestsQuery.data?.items ?? [];
  const total = requestsQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-sm text-text-secondary">
            Review and manage staff leave requests for {activeSchool?.name}
          </p>
        </div>
        {canRequest ? (
          <Button
            onClick={() => {
              setRequestDialogKey((current) => current + 1);
              setRequestOpen(true);
            }}
          >
            Request Time Off
          </Button>
        ) : null}
      </div>

      <Tabs
        value={status}
        onValueChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
      >
        <TabList>
          {STATUS_TABS.map((tab) => (
            <TabTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>

      {decideMutation.isError ? (
        <p className="text-sm text-accent-danger" role="alert">
          {errorMessage(decideMutation.error)}
        </p>
      ) : null}

      {requestsQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : requestsQuery.isError ? (
        <EmptyState
          title="Failed to load time off requests"
          description={errorMessage(requestsQuery.error)}
        />
      ) : requests.length === 0 ? (
        <EmptyState
          title={`No ${status} requests`}
          description={
            status === "requested"
              ? "There are no time off requests waiting for a decision."
              : `There are no ${status} time off requests.`
          }
        />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {requests.map((request) => (
                <li key={request.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {request.employeeName ?? `Employee #${request.employeeId}`}
                      </span>
                      <Badge variant={STATUS_BADGES[request.status] ?? "neutral"}>
                        {request.status}
                      </Badge>
                      {request.policyName ? (
                        <Badge variant="outline">{request.policyName}</Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {request.startDate} → {request.endDate}
                    </div>
                    {request.reason ? (
                      <p className="text-sm text-text-secondary">{request.reason}</p>
                    ) : null}
                  </div>
                  {status === "requested" && canApprove ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        loading={
                          decideMutation.isPending &&
                          decideMutation.variables?.requestId === request.id &&
                          decideMutation.variables?.decision === "approved"
                        }
                        onClick={() =>
                          decideMutation.mutate({
                            requestId: request.id,
                            decision: "approved",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={
                          decideMutation.isPending &&
                          decideMutation.variables?.requestId === request.id &&
                          decideMutation.variables?.decision === "refused"
                        }
                        onClick={() =>
                          decideMutation.mutate({
                            requestId: request.id,
                            decision: "refused",
                          })
                        }
                      >
                        Refuse
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
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
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {canRequest ? (
        <RequestTimeOffDialog
          key={requestDialogKey}
          open={requestOpen}
          onOpenChange={setRequestOpen}
          schoolId={schoolId}
        />
      ) : null}
    </div>
  );
}

function RequestTimeOffDialog({
  open,
  onOpenChange,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
}) {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: erpKeys.employees(schoolId, { page: 1, source: "time-off-dialog" }),
    queryFn: () => getErpEmployees(schoolId, { page: 1, pageSize: 50 }),
    enabled: open,
  });

  const policiesQuery = useQuery({
    queryKey: erpKeys.timeOffPolicies(schoolId),
    queryFn: () => getErpTimeOffPolicies(schoolId),
    enabled: open,
  });

  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [policyId, setPolicyId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: {
      employeeId: number;
      policyId: number;
      startDate: string;
      endDate: string;
      reason?: string;
    }) => createErpTimeOffRequest(schoolId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(errorMessage(mutationError));
    },
  });

  const employees = employeesQuery.data?.items ?? [];
  const policies = policiesQuery.data?.policies ?? [];

  const handleSubmit = () => {
    if (employeeId === "" || policyId === "" || !startDate || !endDate) return;
    if (startDate > endDate) {
      setError("Start date must not be after end date.");
      return;
    }
    setError(null);
    createMutation.mutate({
      employeeId,
      policyId,
      startDate,
      endDate,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogDescription>
          Submit a leave request on behalf of an employee. Requests under policies that require
          approval start as requested.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Employee</label>
          <Select
            value={employeeId}
            onChange={(event) =>
              setEmployeeId(event.target.value === "" ? "" : Number(event.target.value))
            }
          >
            <option value="">
              {employeesQuery.isPending ? "Loading employees..." : "Select an employee"}
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} ({employee.employeeCode})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Policy</label>
          <Select
            value={policyId}
            onChange={(event) =>
              setPolicyId(event.target.value === "" ? "" : Number(event.target.value))
            }
          >
            <option value="">
              {policiesQuery.isPending ? "Loading policies..." : "Select a policy"}
            </option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
                {policy.paid ? " (paid)" : " (unpaid)"}
                {policy.requiresApproval ? "" : " (auto-approved)"}
              </option>
            ))}
          </Select>
          {policies.length === 0 && !policiesQuery.isPending ? (
            <p className="mt-1.5 text-xs text-text-secondary">
              No time off policies exist yet. Ask an approver to create one first.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Family event, medical leave, ..."
          rows={3}
        />
        {error ? (
          <p className="text-sm text-accent-danger" role="alert">
            {error}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={createMutation.isPending}
          disabled={employeeId === "" || policyId === "" || !startDate || !endDate}
        >
          Submit Request
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
