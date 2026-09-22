"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, XCircle } from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LinearProgress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TabContent, TabList, TabTrigger, Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createErpApprovalPolicy,
  createErpRequestApproval,
  ErpApiError,
  erpKeys,
  getErpApprovalPolicies,
  getErpRequestApprovals,
  voteErpRequestApproval,
  type ErpRequestApproval,
} from "@/lib/erp-api";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  time_off: "Time Off",
  expense: "Expense",
  fee_waiver: "Fee Waiver",
  custom: "Custom",
};

const STATUS_FILTERS = ["requested", "approved", "refused"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "refused") return "danger" as const;
  return "warning" as const;
}

function voteVariant(vote: string) {
  return vote === "approve" ? ("success" as const) : ("danger" as const);
}

function voteLabel(vote: string) {
  return vote === "approve" ? "Approved" : "Refused";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function typeLabel(requestType: string) {
  return REQUEST_TYPE_LABELS[requestType] ?? requestType;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ---------------------------------------------------------------------------
// Requests tab
// ---------------------------------------------------------------------------

function RequestCard({
  request,
  canVote,
  onVote,
}: {
  request: ErpRequestApproval;
  canVote: boolean;
  onVote: (request: ErpRequestApproval, vote: "approve" | "refuse") => void;
}) {
  const approveVotes = request.voters.filter((voter) => voter.vote === "approve").length;
  const pending = request.status === "requested";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{request.title}</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              Requested by {request.requestedByName ?? "Unknown"} · {formatDate(request.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{typeLabel(request.requestType)}</Badge>
            <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {request.description ? (
          <p className="text-sm text-text-secondary">{request.description}</p>
        ) : null}

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            Approval votes: {approveVotes} of {request.minApprovals} required
          </span>
          {request.decidedAt ? <span>Decided {formatDate(request.decidedAt)}</span> : null}
        </div>
        <LinearProgress
          value={approveVotes}
          max={request.minApprovals}
          colorVariant={request.status === "refused" ? "danger" : "primary"}
          aria-label={`Approval progress for ${request.title}`}
        />

        {request.voters.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-text-secondary">Votes</div>
            <ul className="space-y-1.5">
              {request.voters.map((voter) => (
                <li
                  key={`${request.id}-${voter.voterUserId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-subtle px-3 py-2 text-sm"
                >
                  <span className="font-medium">{voter.name}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {voter.comment ? (
                      <span className="text-xs text-text-secondary">{voter.comment}</span>
                    ) : null}
                    <Badge variant={voteVariant(voter.vote)} size="sm">
                      {voteLabel(voter.vote)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-text-secondary">No votes recorded yet.</p>
        )}

        {canVote && pending ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              iconLeft={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => onVote(request, "approve")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              iconLeft={<XCircle className="h-4 w-4" />}
              onClick={() => onVote(request, "refuse")}
            >
              Refuse
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

type VoteTarget = { request: ErpRequestApproval; vote: "approve" | "refuse" };

function RequestsTab({ schoolId, canAct }: { schoolId: number; canAct: boolean }) {
  const [status, setStatus] = useState<StatusFilter>("requested");
  const [voteTarget, setVoteTarget] = useState<VoteTarget | null>(null);
  const [comment, setComment] = useState("");

  const requestsQuery = useQuery({
    queryKey: erpKeys.requestApprovals(schoolId, { status }),
    queryFn: () => getErpRequestApprovals(schoolId, status),
  });

  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: (target: VoteTarget) =>
      voteErpRequestApproval(schoolId, target.request.id, target.vote, comment.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      setVoteTarget(null);
      setComment("");
    },
  });

  const openVoteDialog = (request: ErpRequestApproval, vote: "approve" | "refuse") => {
    setComment("");
    setVoteTarget({ request, vote });
  };

  if (requestsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (requestsQuery.isError) {
    return (
      <EmptyState
        title="Failed to load requests"
        description={errorMessage(requestsQuery.error, "Unknown error")}
      />
    );
  }

  const { items, total } = requestsQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={status === option ? "primary" : "secondary"}
              onClick={() => setStatus(option)}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Button>
          ))}
        </div>
        <span className="text-sm text-text-secondary">
          {total} request{total === 1 ? "" : "s"}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No approval requests"
          description={`No ${status} approval requests for this school.`}
        />
      ) : (
        <div className="space-y-4">
          {items.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              canVote={canAct}
              onVote={openVoteDialog}
            />
          ))}
        </div>
      )}

      <Dialog open={voteTarget !== null} onOpenChange={(open) => !open && setVoteTarget(null)}>
        {voteTarget ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {voteTarget.vote === "approve" ? "Approve request" : "Refuse request"}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <p className="text-sm text-text-secondary">
                {voteTarget.vote === "approve"
                  ? "Cast an approval vote for"
                  : "Cast a refusal vote against"}{" "}
                <span className="font-medium text-text-primary">{voteTarget.request.title}</span>.
              </p>
              <Textarea
                label="Comment (optional)"
                placeholder="Add context for your vote"
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {voteMutation.isError ? (
                <p className="text-xs text-accent-danger" role="alert">
                  {errorMessage(voteMutation.error, "Failed to record vote")}
                </p>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setVoteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant={voteTarget.vote === "approve" ? "success" : "danger"}
                loading={voteMutation.isPending}
                onClick={() => voteMutation.mutate(voteTarget)}
              >
                Confirm {voteTarget.vote === "approve" ? "Approval" : "Refusal"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Policies tab
// ---------------------------------------------------------------------------

function PoliciesTab({ schoolId, canManage }: { schoolId: number; canManage: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [requestType, setRequestType] = useState("time_off");
  const [minApprovals, setMinApprovals] = useState("1");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const policiesQuery = useQuery({
    queryKey: erpKeys.approvalPolicies(schoolId),
    queryFn: () => getErpApprovalPolicies(schoolId),
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createErpApprovalPolicy(schoolId, {
        name: name.trim(),
        requestType,
        description: description.trim() || undefined,
        minApprovals: Number(minApprovals),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      setDialogOpen(false);
      setName("");
      setRequestType("time_off");
      setMinApprovals("1");
      setDescription("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof ErpApiError && error.code === "POLICY_EXISTS"
          ? "A policy already exists for this request type."
          : errorMessage(error, "Failed to create policy")
      );
    },
  });

  const resetForm = () => {
    setName("");
    setRequestType("time_off");
    setMinApprovals("1");
    setDescription("");
    setFormError(null);
  };

  const submit = () => {
    if (!name.trim()) {
      setFormError("Policy name is required.");
      return;
    }
    const parsedMin = Number(minApprovals);
    if (!Number.isInteger(parsedMin) || parsedMin < 1 || parsedMin > 50) {
      setFormError("Minimum approvals must be between 1 and 50.");
      return;
    }
    setFormError(null);
    createMutation.mutate();
  };

  if (policiesQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (policiesQuery.isError) {
    return (
      <EmptyState
        title="Failed to load policies"
        description={errorMessage(policiesQuery.error, "Unknown error")}
      />
    );
  }

  const { policies } = policiesQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Policies define how many approval votes each request type needs.
        </p>
        {canManage ? (
          <Button
            size="sm"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            Add Policy
          </Button>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <EmptyState
          title="No approval policies"
          description="Create a policy to define approval rules for request types."
          action={
            canManage ? (
              <Button
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              >
                Add Policy
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Request type</th>
                <th className="px-4 py-3 font-medium">Min approvals</th>
                <th className="px-4 py-3 font-medium">Approvers</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-bg-subtle/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{policy.name}</div>
                    {policy.description ? (
                      <div className="mt-0.5 text-xs text-text-secondary">{policy.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{typeLabel(policy.requestType)}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{policy.minApprovals}</td>
                  <td className="px-4 py-3">
                    {policy.approverEmployeeIds && policy.approverEmployeeIds.length > 0 ? (
                      <span>{policy.approverEmployeeIds.length} employees</span>
                    ) : (
                      <span className="text-text-secondary">Anyone who can act</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={policy.isActive ? "success" : "neutral"}>
                      {policy.isActive ? "active" : "inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>Create Approval Policy</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            label="Policy name"
            placeholder="e.g., Time off needs two approvers"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="policy-request-type" className="block text-sm font-medium">
              Request type
            </label>
            <Select
              id="policy-request-type"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
            >
              {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-text-secondary">
              One policy per request type. The new request picks up the policy automatically.
            </p>
          </div>
          <Input
            label="Minimum approvals"
            type="number"
            min={1}
            max={50}
            value={minApprovals}
            onChange={(e) => setMinApprovals(e.target.value)}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What this policy covers"
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {formError ? (
            <p className="text-xs text-accent-danger" role="alert">
              {formError}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button loading={createMutation.isPending} onClick={submit}>
            Create Policy
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New request dialog (APPROVALS_ACT)
// ---------------------------------------------------------------------------

function NewRequestDialog({
  schoolId,
  open,
  onOpenChange,
}: {
  schoolId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [requestType, setRequestType] = useState("time_off");
  const [requestId, setRequestId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createErpRequestApproval(schoolId, {
        requestType,
        requestId: Number(requestId),
        title: title.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      onOpenChange(false);
      setRequestType("time_off");
      setRequestId("");
      setTitle("");
      setDescription("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError(errorMessage(error, "Failed to create request"));
    },
  });

  const submit = () => {
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    const parsedId = Number(requestId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setFormError("Request ID must be a positive number.");
      return;
    }
    setFormError(null);
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>New Approval Request</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="request-type" className="block text-sm font-medium">
            Request type
          </label>
          <Select
            id="request-type"
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
          >
            {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Request ID"
          type="number"
          min={1}
          placeholder="ID of the record being approved"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <Input
          label="Title"
          placeholder="Short summary of the request"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Description (optional)"
          placeholder="Details for approvers"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {formError ? (
          <p className="text-xs text-accent-danger" role="alert">
            {formError}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button loading={createMutation.isPending} onClick={submit}>
          Submit Request
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export function ApprovalsClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  const canView = hasPermission("APPROVALS_VIEW");
  const canAct = hasPermission("APPROVALS_ACT");
  const canViewPolicies = hasPermission("APPROVAL_POLICIES_VIEW");
  const canManagePolicies = hasPermission("APPROVAL_POLICIES_MANAGE");

  if (!schoolId) return null;

  if (!canView && !canViewPolicies) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include approvals access for this school."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="text-sm text-text-secondary">
            Review requests, cast votes, and manage approval policies.
          </p>
        </div>
        {canAct ? (
          <Button
            size="sm"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setNewRequestOpen(true)}
          >
            New Request
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue={canView ? "requests" : "policies"}>
        <TabList variant="pills" className="flex-wrap">
          {canView ? (
            <TabTrigger value="requests" variant="pills" layoutId="approvals-tab-indicator">
              Requests
            </TabTrigger>
          ) : null}
          {canViewPolicies ? (
            <TabTrigger value="policies" variant="pills" layoutId="approvals-tab-indicator">
              Policies
            </TabTrigger>
          ) : null}
        </TabList>

        {canView ? (
          <TabContent value="requests" className="mt-4">
            <RequestsTab schoolId={schoolId} canAct={canAct} />
          </TabContent>
        ) : null}
        {canViewPolicies ? (
          <TabContent value="policies" className="mt-4">
            <PoliciesTab schoolId={schoolId} canManage={canManagePolicies} />
          </TabContent>
        ) : null}
      </Tabs>

      {canAct ? (
        <NewRequestDialog
          schoolId={schoolId}
          open={newRequestOpen}
          onOpenChange={setNewRequestOpen}
        />
      ) : null}
    </div>
  );
}
