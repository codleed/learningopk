"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

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
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createErpFeeStructure, getErpFeeStructures, type ErpFeeStructure } from "@/lib/erp-api";

const CLASS_LEVELS = ["9", "10"] as const;

type ComponentDraft = { name: string; amount: string };

function formatMoney(value: string): string {
  return `Rs ${Number(value).toLocaleString()}`;
}

function FeeStructureCard({ structure }: { structure: ErpFeeStructure }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{structure.name}</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              {structure.classLevel ? `Class ${structure.classLevel}` : "All classes"}
            </p>
          </div>
          <Badge variant={structure.isActive ? "success" : "neutral"}>
            {structure.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-2xl font-bold text-accent-primary">
          {formatMoney(structure.totalAmount)}
        </div>
        <div className="text-xs text-text-secondary">Total per student</div>
        {structure.components.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {structure.components.map((component, index) => (
              <li
                key={component.id ?? `${component.name}-${index}`}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="min-w-0 truncate text-text-secondary">
                  {component.name}
                  {component.isOptional ? " (optional)" : ""}
                </span>
                <span className="shrink-0 font-medium">{formatMoney(component.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">No components.</p>
        )}
      </CardBody>
    </Card>
  );
}

function CreateFeeStructureDialog({
  open,
  onOpenChange,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: number;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState<string>("9");
  const [components, setComponents] = useState<ComponentDraft[]>([{ name: "", amount: "" }]);

  const createMutation = useMutation({
    mutationFn: () =>
      createErpFeeStructure(schoolId, {
        name,
        classLevel,
        components: components
          .filter((component) => component.name.trim() !== "" && component.amount !== "")
          .map((component) => ({
            name: component.name.trim(),
            amount: Number(component.amount),
          })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["erp"] });
      onOpenChange(false);
      setName("");
      setClassLevel("9");
      setComponents([{ name: "", amount: "" }]);
    },
  });

  const updateComponent = (index: number, patch: Partial<ComponentDraft>) => {
    setComponents((prev) =>
      prev.map((component, i) => (i === index ? { ...component, ...patch } : component))
    );
  };

  const filledComponents = components.filter(
    (component) => component.name.trim() !== "" && component.amount !== ""
  );
  const total = filledComponents.reduce((sum, component) => sum + Number(component.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg">
      <DialogHeader>
        <DialogTitle>Add Fee Structure</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Class 9 Annual Fees"
        />
        <div className="space-y-1.5">
          <label htmlFor="fee-class-level" className="block text-sm font-medium text-text-primary">
            Class Level
          </label>
          <Select
            id="fee-class-level"
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
          >
            {CLASS_LEVELS.map((level) => (
              <option key={level} value={level}>
                Class {level}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-text-primary">Components</div>
          {components.map((component, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={component.name}
                  onChange={(e) => updateComponent(index, { name: e.target.value })}
                  placeholder="Component name (e.g. Tuition)"
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={component.amount}
                  onChange={(e) => updateComponent(index, { amount: e.target.value })}
                  placeholder="Amount"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1.5"
                onClick={() =>
                  setComponents((prev) =>
                    prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
                  )
                }
                aria-label="Remove component"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setComponents((prev) => [...prev, { name: "", amount: "" }])}
          >
            Add Component
          </Button>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-text-secondary">Total</span>
            <span className="font-semibold text-accent-primary">
              Rs {Number.isFinite(total) ? total.toLocaleString() : 0}
            </span>
          </div>
        </div>

        {createMutation.isError ? (
          <p className="text-sm text-accent-danger">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create fee structure"}
          </p>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          loading={createMutation.isPending}
          disabled={
            name.trim() === "" ||
            filledComponents.length === 0 ||
            filledComponents.some((component) => Number.isNaN(Number(component.amount)))
          }
          onClick={() => createMutation.mutate()}
        >
          Create Structure
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function FeesClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id;
  const canManage = hasPermission("FEES_MANAGE");
  const [createOpen, setCreateOpen] = useState(false);

  const structuresQuery = useQuery({
    queryKey: ["erp", "feeStructures", schoolId],
    queryFn: () => getErpFeeStructures(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("FEES_VIEW"),
  });

  if (!schoolId) return null;

  if (!hasPermission("FEES_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include fee structure viewing for this school."
      />
    );
  }

  if (structuresQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (structuresQuery.isError) {
    return (
      <EmptyState
        title="Failed to load fee structures"
        description={
          structuresQuery.error instanceof Error ? structuresQuery.error.message : "Unknown error"
        }
      />
    );
  }

  const structures = structuresQuery.data.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fee Structures</h1>
          <p className="text-sm text-text-secondary">
            Fee components and totals billed to students
          </p>
        </div>
        {canManage ? (
          <Button iconLeft={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Fee Structure
          </Button>
        ) : null}
      </div>

      {structures.length === 0 ? (
        <EmptyState
          title="No fee structures yet"
          description="Create a fee structure to bill students for tuition and other components."
          action={
            canManage ? (
              <Button iconLeft={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                Add Fee Structure
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {structures.map((structure) => (
            <FeeStructureCard key={structure.id} structure={structure} />
          ))}
        </div>
      )}

      {canManage ? (
        <CreateFeeStructureDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          schoolId={schoolId}
        />
      ) : null}
    </div>
  );
}
