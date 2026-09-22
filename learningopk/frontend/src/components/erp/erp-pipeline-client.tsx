"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KanbanSquare, Plus } from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import {
  createErpDeal,
  createErpPipeline,
  erpKeys,
  getCrmStats,
  getErpContacts,
  getErpDeals,
  getErpPipelines,
  moveErpDeal,
} from "@/lib/erp-api";

type BoardStage = { id: number; name: string; position: number };

const DEFAULT_STAGES = "inquiry, applied, interview, offer, enrolled";

function formatMoney(value: string | number) {
  return `Rs ${Number(value).toLocaleString()}`;
}

export function ErpPipelineClient() {
  const { activeSchool, hasPermission } = useErp();
  const queryClient = useQueryClient();
  const schoolId = activeSchool?.id;

  const canViewPipelines = hasPermission("PIPELINES_VIEW");
  const canManagePipelines = hasPermission("PIPELINES_MANAGE");
  const canManageDeals = hasPermission("DEALS_MANAGE");

  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);

  const [pipelineForm, setPipelineForm] = useState({ name: "", stages: DEFAULT_STAGES });
  const [dealForm, setDealForm] = useState({ title: "", stageId: "", value: "", contactId: "" });

  const pipelinesQuery = useQuery({
    queryKey: erpKeys.pipelines(schoolId ?? 0),
    queryFn: () => getErpPipelines(schoolId!),
    enabled: Boolean(schoolId) && canViewPipelines,
  });

  const pipelines = useMemo(() => pipelinesQuery.data?.pipelines ?? [], [pipelinesQuery.data]);
  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId) ?? null;
  const effectivePipelineId = canViewPipelines
    ? (selectedPipeline?.id ?? pipelines[0]?.id ?? null)
    : null;

  const statsQuery = useQuery({
    queryKey: erpKeys.stats(schoolId ?? 0, `crm-${effectivePipelineId ?? "active"}`),
    queryFn: () => getCrmStats(schoolId!, effectivePipelineId ?? undefined),
    enabled: Boolean(schoolId),
  });

  const resolvedPipelineId = canViewPipelines
    ? effectivePipelineId
    : (statsQuery.data?.pipelineId ?? null);

  const stages = useMemo<BoardStage[]>(() => {
    if (canViewPipelines) {
      const pipeline = pipelines.find((p) => p.id === effectivePipelineId);
      return pipeline ? pipeline.stages : [];
    }
    return (statsQuery.data?.stages ?? []).map((s) => ({
      id: s.stageId,
      name: s.stageName,
      position: s.position,
    }));
  }, [canViewPipelines, pipelines, effectivePipelineId, statsQuery.data?.stages]);

  const dealsQuery = useQuery({
    queryKey: erpKeys.deals(schoolId ?? 0, { pipelineId: resolvedPipelineId, pageSize: 100 }),
    queryFn: () =>
      getErpDeals(schoolId!, { pipelineId: resolvedPipelineId ?? undefined, pageSize: 100 }),
    enabled: Boolean(schoolId) && resolvedPipelineId !== null,
  });

  const contactsQuery = useQuery({
    queryKey: erpKeys.contacts(schoolId ?? 0, { pageSize: 100 }),
    queryFn: () => getErpContacts(schoolId!, { pageSize: 100 }),
    enabled: Boolean(schoolId) && dealDialogOpen && hasPermission("CONTACTS_VIEW"),
  });

  const createPipelineMutation = useMutation({
    mutationFn: (data: Parameters<typeof createErpPipeline>[1]) =>
      createErpPipeline(schoolId!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      setPipelineDialogOpen(false);
      setPipelineError(null);
      setPipelineForm({ name: "", stages: DEFAULT_STAGES });
    },
    onError: (err) => {
      setPipelineError(err instanceof Error ? err.message : "Failed to create pipeline");
    },
  });

  const createDealMutation = useMutation({
    mutationFn: (data: Parameters<typeof createErpDeal>[1]) => createErpDeal(schoolId!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
      setDealDialogOpen(false);
      setDealError(null);
    },
    onError: (err) => {
      setDealError(err instanceof Error ? err.message : "Failed to create deal");
    },
  });

  const moveDealMutation = useMutation({
    mutationFn: (vars: { dealId: number; stageId: number }) =>
      moveErpDeal(schoolId!, vars.dealId, vars.stageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  if (!schoolId) return null;

  if (!hasPermission("DEALS_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include pipeline viewing for this school."
      />
    );
  }

  const deals = dealsQuery.data?.items ?? [];
  const dealsByStage = new Map<number, typeof deals>();
  for (const deal of deals) {
    const list = dealsByStage.get(deal.stageId) ?? [];
    list.push(deal);
    dealsByStage.set(deal.stageId, list);
  }
  const statsStages = statsQuery.data?.stages ?? [];
  const activePipelineName = canViewPipelines
    ? (pipelines.find((p) => p.id === effectivePipelineId)?.name ?? null)
    : null;

  const openDealDialog = () => {
    setDealError(null);
    setDealForm({
      title: "",
      stageId: stages[0] ? String(stages[0].id) : "",
      value: "",
      contactId: "",
    });
    setDealDialogOpen(true);
  };

  const handleCreatePipeline = () => {
    const name = pipelineForm.name.trim();
    const stageList = pipelineForm.stages
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!name) {
      setPipelineError("Pipeline name is required.");
      return;
    }
    if (stageList.length === 0) {
      setPipelineError("Add at least one stage, separated by commas.");
      return;
    }
    setPipelineError(null);
    createPipelineMutation.mutate({ name, stages: stageList });
  };

  const handleCreateDeal = () => {
    const title = dealForm.title.trim();
    const stageId = Number(dealForm.stageId);
    const value = dealForm.value.trim();
    if (!title) {
      setDealError("Title is required.");
      return;
    }
    if (!Number.isSafeInteger(stageId) || stageId <= 0) {
      setDealError("Select a stage.");
      return;
    }
    if (value && !(Number.isFinite(Number(value)) && Number(value) >= 0)) {
      setDealError("Value must be a non-negative amount.");
      return;
    }
    setDealError(null);
    createDealMutation.mutate({
      title,
      pipelineId: resolvedPipelineId!,
      stageId,
      contactId: dealForm.contactId ? Number(dealForm.contactId) : undefined,
      value: value || undefined,
    });
  };

  const pipelineDialog = (
    <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
      <DialogHeader>
        <DialogTitle>Create Pipeline</DialogTitle>
        <DialogDescription>Stages become the board columns, in the order listed.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {pipelineError ? (
          <p className="text-sm text-accent-danger" role="alert">
            {pipelineError}
          </p>
        ) : null}
        <Input
          label="Name"
          value={pipelineForm.name}
          onChange={(e) => setPipelineForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g., Admissions 2025"
          required
        />
        <Input
          label="Stages (comma-separated)"
          value={pipelineForm.stages}
          onChange={(e) => setPipelineForm((f) => ({ ...f, stages: e.target.value }))}
          placeholder="inquiry, applied, interview, offer, enrolled"
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setPipelineDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreatePipeline} loading={createPipelineMutation.isPending}>
          Create Pipeline
        </Button>
      </DialogFooter>
    </Dialog>
  );

  const dealDialog = (
    <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
      <DialogHeader>
        <DialogTitle>Add Deal</DialogTitle>
        <DialogDescription>Track an admission enquiry as a card on the board.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {dealError ? (
          <p className="text-sm text-accent-danger" role="alert">
            {dealError}
          </p>
        ) : null}
        <Input
          label="Title"
          value={dealForm.title}
          onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g., Admission - Ayesha Khan, Grade 9"
          required
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">Stage</label>
          <Select
            value={dealForm.stageId}
            onChange={(e) => setDealForm((f) => ({ ...f, stageId: e.target.value }))}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={String(stage.id)}>
                {stage.name}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Value (Rs)"
          value={dealForm.value}
          onChange={(e) => setDealForm((f) => ({ ...f, value: e.target.value }))}
          placeholder="e.g., 25000"
          inputMode="decimal"
        />
        {hasPermission("CONTACTS_VIEW") ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Contact (optional)
            </label>
            <Select
              value={dealForm.contactId}
              onChange={(e) => setDealForm((f) => ({ ...f, contactId: e.target.value }))}
            >
              <option value="">No contact</option>
              {(contactsQuery.data?.items ?? []).map((contact) => (
                <option key={contact.id} value={String(contact.id)}>
                  {contact.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setDealDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateDeal} loading={createDealMutation.isPending}>
          Add Deal
        </Button>
      </DialogFooter>
    </Dialog>
  );

  if (canViewPipelines && pipelinesQuery.isPending) {
    return (
      <div className="space-y-6">
        <PipelineHeading pipelineName={null} />
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (canViewPipelines && pipelinesQuery.isError) {
    return (
      <EmptyState
        title="Failed to load pipelines"
        description={
          pipelinesQuery.error instanceof Error ? pipelinesQuery.error.message : "Unknown error"
        }
      />
    );
  }

  if (canViewPipelines && pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <PipelineHeading pipelineName={null} />
        <EmptyState
          icon={<KanbanSquare className="h-6 w-6" />}
          title="No admissions pipeline yet"
          description={
            canManagePipelines
              ? "Create a pipeline with stages like inquiry, applied, interview, offer, and enrolled."
              : "Ask an administrator to create an admissions pipeline for this school."
          }
          action={
            canManagePipelines ? (
              <Button
                onClick={() => {
                  setPipelineError(null);
                  setPipelineDialogOpen(true);
                }}
                iconLeft={<Plus className="h-4 w-4" />}
              >
                Create Pipeline
              </Button>
            ) : undefined
          }
        />
        {pipelineDialog}
      </div>
    );
  }

  if (!canViewPipelines && statsQuery.isPending) {
    return (
      <div className="space-y-6">
        <PipelineHeading pipelineName={null} />
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!canViewPipelines && statsQuery.isError) {
    return (
      <EmptyState
        title="Failed to load pipeline"
        description={statsQuery.error instanceof Error ? statsQuery.error.message : "Unknown error"}
      />
    );
  }

  if (resolvedPipelineId === null) {
    return (
      <div className="space-y-6">
        <PipelineHeading pipelineName={null} />
        <EmptyState
          icon={<KanbanSquare className="h-6 w-6" />}
          title="No active pipeline"
          description="There is no active admissions pipeline for this school yet."
        />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="space-y-6">
        <PipelineHeading pipelineName={activePipelineName} />
        <EmptyState
          icon={<KanbanSquare className="h-6 w-6" />}
          title="This pipeline has no stages"
          description="A pipeline needs at least one stage before deals can be tracked on the board."
        />
      </div>
    );
  }

  const totalDeals = dealsQuery.data?.total ?? 0;
  const hiddenDeals = Math.max(0, totalDeals - deals.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PipelineHeading pipelineName={activePipelineName} />
        <div className="flex flex-wrap items-center gap-3">
          {canViewPipelines && pipelines.length > 1 ? (
            <Select
              value={String(effectivePipelineId)}
              onChange={(e) => setSelectedPipelineId(Number(e.target.value))}
              className="w-56"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={String(pipeline.id)}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
          ) : null}
          {canManageDeals ? (
            <Button onClick={openDealDialog} iconLeft={<Plus className="h-4 w-4" />}>
              Add Deal
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {statsStages.map((stage) => (
          <div
            key={stage.stageId}
            className="min-w-40 flex-1 rounded-lg border border-border bg-bg-surface px-4 py-3"
          >
            <p className="truncate text-xs font-medium text-text-secondary">{stage.stageName}</p>
            <p className="mt-1 text-lg font-bold text-text-primary">{stage.dealCount}</p>
            <p className="text-xs text-text-secondary">{formatMoney(stage.totalValue)}</p>
          </div>
        ))}
        {statsQuery.data ? (
          <div className="min-w-40 rounded-lg border border-accent-primary/20 bg-accent-primary-light px-4 py-3">
            <p className="text-xs font-medium text-accent-primary">Total</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {statsQuery.data.totals.dealCount}
            </p>
            <p className="text-xs text-text-secondary">
              {formatMoney(statsQuery.data.totals.totalValue)}
            </p>
          </div>
        ) : null}
      </div>

      {statsQuery.isError ? (
        <EmptyState
          title="Failed to load funnel summary"
          description={
            statsQuery.error instanceof Error ? statsQuery.error.message : "Unknown error"
          }
        />
      ) : null}

      {dealsQuery.isPending ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : dealsQuery.isError ? (
        <EmptyState
          title="Failed to load deals"
          description={
            dealsQuery.error instanceof Error ? dealsQuery.error.message : "Unknown error"
          }
        />
      ) : (
        <div className="flex items-stretch gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) ?? [];
            return (
              <div
                key={stage.id}
                className="flex w-72 min-w-72 flex-col gap-3 rounded-xl border border-border bg-bg-subtle/40 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text-primary">{stage.name}</p>
                  <Badge variant="neutral">{stageDeals.length}</Badge>
                </div>
                {stageDeals.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                    No deals
                  </p>
                ) : (
                  stageDeals.map((deal) => {
                    const moving =
                      moveDealMutation.isPending && moveDealMutation.variables?.dealId === deal.id;
                    return (
                      <Card key={deal.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {deal.title}
                            </p>
                            <p className="truncate text-xs text-text-secondary">
                              {deal.contactName ?? "No contact"}
                            </p>
                          </div>
                          <Badge variant="primary" size="sm">
                            {formatMoney(deal.value)}
                          </Badge>
                        </div>
                        {canManageDeals && stages.length > 1 ? (
                          <div className="mt-3">
                            <Select
                              value={String(deal.stageId)}
                              disabled={moving}
                              aria-label={`Move ${deal.title} to another stage`}
                              onChange={(e) =>
                                moveDealMutation.mutate({
                                  dealId: deal.id,
                                  stageId: Number(e.target.value),
                                })
                              }
                              className="h-8 px-2 text-xs"
                            >
                              {stages.map((s) => (
                                <option key={s.id} value={String(s.id)}>
                                  {s.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : null}
                        {moveDealMutation.isError &&
                        moveDealMutation.variables?.dealId === deal.id ? (
                          <p className="mt-2 text-xs text-accent-danger" role="alert">
                            {moveDealMutation.error instanceof Error
                              ? moveDealMutation.error.message
                              : "Failed to move deal"}
                          </p>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {hiddenDeals > 0 ? (
        <p className="text-sm text-text-secondary">
          Showing the first {deals.length} deals. {hiddenDeals} more on other pages are not shown.
        </p>
      ) : null}

      {pipelineDialog}
      {dealDialog}
    </div>
  );
}

function PipelineHeading({ pipelineName }: { pipelineName: string | null }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Admissions Pipeline</h1>
      <p className="text-sm text-text-secondary">
        {pipelineName ? `${pipelineName} — deals by stage` : "Deals by stage"}
      </p>
    </div>
  );
}
