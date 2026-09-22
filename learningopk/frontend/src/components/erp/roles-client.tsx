"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";

import { useErp } from "@/components/erp/erp-provider";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  assignErpRoles,
  createErpRole,
  deleteErpRole,
  erpKeys,
  getErpPermissions,
  getErpRoleMembers,
  getErpRoles,
  seedErpSystemRoles,
  updateErpRole,
  type ErpRole,
} from "@/lib/erp-api";

const GROUP_LABELS: Record<string, string> = {
  ERP: "Core",
  ROLES: "Roles",
  TAGS: "Tags",
  INVITES: "Invites",
  EMPLOYEES: "Employees",
  DEPARTMENTS: "Departments",
  TEAMS: "Teams",
  ATTENDANCE: "Attendance",
  TIME: "Time Off",
  PAYROLL: "Payroll",
  EXPENSES: "Expenses",
  CONTACTS: "Contacts",
  PIPELINES: "Pipelines",
  DEALS: "Deals",
  FEES: "Fees",
  INVOICES: "Invoices",
  PAYMENTS: "Payments",
  CLASSES: "Classes",
  ENROLLMENTS: "Enrollments",
  TIMETABLE: "Timetable",
  EXAMS: "Exams",
  GRADES: "Grades",
  APPROVAL: "Approval Policies",
  APPROVALS: "Approvals",
  DASHBOARD: "Dashboard",
};

type PermissionGroup = { prefix: string; label: string; permissions: string[] };

function groupPermissionCatalogue(catalogue: string[]): PermissionGroup[] {
  const byPrefix = new Map<string, string[]>();
  for (const permission of catalogue) {
    const prefix = permission.split("_")[0] ?? permission;
    const existing = byPrefix.get(prefix);
    if (existing) {
      existing.push(permission);
    } else {
      byPrefix.set(prefix, [permission]);
    }
  }
  return Array.from(byPrefix.entries(), ([prefix, permissions]) => ({
    prefix,
    label: GROUP_LABELS[prefix] ?? prefix.charAt(0) + prefix.slice(1).toLowerCase(),
    permissions,
  }));
}

function togglePermission(selected: string[], permission: string): string[] {
  return selected.includes(permission)
    ? selected.filter((item) => item !== permission)
    : [...selected, permission];
}

function togglePermissionGroup(selected: string[], group: PermissionGroup): string[] {
  const groupPermissions = new Set(group.permissions);
  const allSelected = group.permissions.every((permission) => selected.includes(permission));
  if (allSelected) {
    return selected.filter((permission) => !groupPermissions.has(permission));
  }
  const next = new Set(selected);
  for (const permission of group.permissions) {
    next.add(permission);
  }
  return [...next];
}

function samePermissions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((permission) => set.has(permission));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function PermissionGroups({
  groups,
  selected,
  onToggle,
  onToggleGroup,
  disabled = false,
}: {
  groups: PermissionGroup[];
  selected: string[];
  onToggle: (permission: string) => void;
  onToggleGroup: (group: PermissionGroup) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const selectedCount = group.permissions.filter((permission) =>
          selected.includes(permission)
        ).length;
        const allSelected = selectedCount === group.permissions.length;
        return (
          <div key={group.prefix} className="rounded-lg border border-border bg-bg-subtle/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Checkbox
                label={group.label}
                checked={allSelected}
                onChange={() => onToggleGroup(group)}
                disabled={disabled}
              />
              <span className="shrink-0 text-xs text-text-secondary">
                {selectedCount}/{group.permissions.length}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.permissions.map((permission) => (
                <Checkbox
                  key={permission}
                  label={permission}
                  checked={selected.includes(permission)}
                  onChange={() => onToggle(permission)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({
  role,
  groups,
  schoolId,
  expanded,
  onToggleExpand,
  canManage,
  onSavePermissions,
  savePending,
  saveError,
  onRequestDelete,
}: {
  role: ErpRole;
  groups: PermissionGroup[];
  schoolId: number;
  expanded: boolean;
  onToggleExpand: () => void;
  canManage: boolean;
  onSavePermissions: (roleId: number, permissions: string[]) => void;
  savePending: boolean;
  saveError: string | null;
  onRequestDelete: (role: ErpRole) => void;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? role.permissions;
  const dirty = draft !== null && !samePermissions(draft, role.permissions);

  const membersQuery = useQuery({
    queryKey: [...erpKeys.all, "roleMembers", schoolId, role.id],
    queryFn: () => getErpRoleMembers(schoolId, role.id),
    enabled: expanded,
  });

  function handleToggleExpand() {
    if (expanded) {
      setDraft(null);
    }
    onToggleExpand();
  }

  return (
    <Card>
      <button
        type="button"
        onClick={handleToggleExpand}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-subtle/60"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-text-primary">{role.name}</span>
            {role.isSystem ? (
              <Badge variant="primary">System</Badge>
            ) : (
              <Badge variant="neutral">Custom</Badge>
            )}
          </span>
          <span className="mt-1 block truncate text-xs text-text-secondary">{role.key}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Badge variant="outline">{role.permissions.length} permissions</Badge>
          <ChevronDown
            className={`h-4 w-4 text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {expanded ? (
        <CardBody className="space-y-4 border-t border-border">
          {role.description ? (
            <p className="text-sm text-text-secondary">{role.description}</p>
          ) : null}

          <div className="rounded-lg border border-border bg-bg-subtle/40 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Members
            </div>
            {membersQuery.isPending ? (
              <Spinner size="sm" />
            ) : membersQuery.isError ? (
              <p className="text-sm text-accent-danger">Failed to load members</p>
            ) : membersQuery.data.members.length === 0 ? (
              <p className="text-sm text-text-secondary">No members assigned to this role.</p>
            ) : (
              <div className="space-y-1.5">
                {membersQuery.data.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {member.name} <span className="text-text-secondary">{member.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      since {member.assignedAt.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PermissionGroups
            groups={groups}
            selected={selected}
            onToggle={(permission) => setDraft(togglePermission(selected, permission))}
            onToggleGroup={(group) => setDraft(togglePermissionGroup(selected, group))}
            disabled={!canManage}
          />

          {saveError ? <p className="text-sm text-accent-danger">{saveError}</p> : null}

          {canManage ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!role.isSystem ? (
                <Button
                  variant="danger"
                  size="sm"
                  className="mr-auto"
                  onClick={() => onRequestDelete(role)}
                >
                  Delete role
                </Button>
              ) : null}
              {dirty ? (
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                  Discard changes
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={!dirty}
                loading={savePending}
                onClick={() => onSavePermissions(role.id, selected)}
              >
                Save permissions
              </Button>
            </div>
          ) : (
            <p className="text-xs text-text-secondary">
              You need role management permission to edit this matrix.
            </p>
          )}
        </CardBody>
      ) : null}
    </Card>
  );
}

export function RolesClient() {
  const { activeSchool, hasPermission } = useErp();
  const schoolId = activeSchool?.id ?? null;
  const canManage = hasPermission("ROLES_MANAGE");
  const queryClient = useQueryClient();

  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ErpRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleIds, setAssignRoleIds] = useState<number[]>([]);

  const rolesQuery = useQuery({
    queryKey: erpKeys.roles(schoolId ?? 0),
    queryFn: () => getErpRoles(schoolId!),
    enabled: Boolean(schoolId) && hasPermission("ROLES_VIEW"),
  });

  const permissionsQuery = useQuery({
    queryKey: [...erpKeys.all, "permissions"],
    queryFn: () => getErpPermissions(),
  });

  const savePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: number; permissions: string[] }) =>
      updateErpRole(schoolId!, roleId, { permissions }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: ({ roleId }: { roleId: number }) => deleteErpRole(schoolId!, roleId),
    onSuccess: (_data, variables) => {
      setDeleteTarget(null);
      setExpandedRoleId((current) => (current === variables.roleId ? null : current));
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (input: {
      key: string;
      name: string;
      description?: string;
      permissions: string[];
    }) => createErpRole(schoolId!, input),
    onSuccess: () => {
      setCreateOpen(false);
      setCreateKey("");
      setCreateName("");
      setCreateDescription("");
      setCreatePermissions([]);
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  const assignRolesMutation = useMutation({
    mutationFn: (input: { userId: string; roleIds: number[] }) =>
      assignErpRoles(schoolId!, input.userId, input.roleIds),
    onSuccess: () => {
      setAssignUserId("");
      setAssignRoleIds([]);
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  const seedRolesMutation = useMutation({
    mutationFn: () => seedErpSystemRoles(schoolId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.all });
    },
  });

  if (!schoolId) return null;

  if (!hasPermission("ROLES_VIEW")) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include roles viewing for this school."
      />
    );
  }

  if (rolesQuery.isPending || permissionsQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (rolesQuery.isError) {
    return <EmptyState title="Failed to load roles" description={errorMessage(rolesQuery.error)} />;
  }

  if (permissionsQuery.isError) {
    return (
      <EmptyState
        title="Failed to load permissions"
        description={errorMessage(permissionsQuery.error)}
      />
    );
  }

  const roles = rolesQuery.data.roles;
  const groups = groupPermissionCatalogue(permissionsQuery.data.permissions);

  function openCreateDialog() {
    createRoleMutation.reset();
    setCreateError(null);
    setCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (open) {
      createRoleMutation.reset();
      setCreateError(null);
    }
  }

  function submitCreateRole() {
    const key = createKey.trim();
    const name = createName.trim();
    if (key.length < 2 || key.length > 40 || !/^[a-z0-9_]+$/.test(key)) {
      setCreateError(
        "Key must be 2-40 characters using lowercase letters, numbers and underscores."
      );
      return;
    }
    if (name.length < 2 || name.length > 80) {
      setCreateError("Name must be 2-80 characters.");
      return;
    }
    setCreateError(null);
    createRoleMutation.mutate({
      key,
      name,
      description: createDescription.trim() || undefined,
      permissions: createPermissions,
    });
  }

  function toggleAssignRole(roleId: number) {
    setAssignRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Roles &amp; Access</h1>
          <p className="text-sm text-text-secondary">
            Manage the permission matrix and role assignments for {activeSchool?.name}.
          </p>
        </div>
        {canManage ? (
          <Button iconLeft={<Plus className="h-4 w-4" />} onClick={openCreateDialog}>
            Create role
          </Button>
        ) : null}
      </div>

      {roles.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No roles yet"
            description="This school has no roles configured. Seed the default system roles or create a custom role."
            action={
              canManage ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    loading={seedRolesMutation.isPending}
                    onClick={() => seedRolesMutation.mutate()}
                  >
                    Seed system roles
                  </Button>
                  <Button onClick={openCreateDialog}>Create role</Button>
                </div>
              ) : null
            }
          />
          {seedRolesMutation.isError ? (
            <p className="text-center text-sm text-accent-danger">
              {errorMessage(seedRolesMutation.error)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              groups={groups}
              schoolId={schoolId}
              expanded={expandedRoleId === role.id}
              onToggleExpand={() =>
                setExpandedRoleId((current) => (current === role.id ? null : role.id))
              }
              canManage={canManage}
              onSavePermissions={(roleId, permissions) =>
                savePermissionsMutation.mutate({ roleId, permissions })
              }
              savePending={
                savePermissionsMutation.isPending &&
                savePermissionsMutation.variables?.roleId === role.id
              }
              saveError={
                savePermissionsMutation.isError &&
                savePermissionsMutation.variables?.roleId === role.id
                  ? errorMessage(savePermissionsMutation.error)
                  : null
              }
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {canManage && roles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Assign Roles</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="User ID"
              value={assignUserId}
              onChange={(event) => setAssignUserId(event.target.value)}
              placeholder="Platform user ID of the teacher or staff member"
            />
            <p className="text-xs text-text-secondary">
              Assigning replaces the user&apos;s current roles in this school.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <Checkbox
                  key={role.id}
                  label={`${role.name} (${role.key})`}
                  checked={assignRoleIds.includes(role.id)}
                  onChange={() => toggleAssignRole(role.id)}
                  disabled={assignRolesMutation.isPending}
                />
              ))}
            </div>
            {assignRolesMutation.isError ? (
              <p className="text-sm text-accent-danger">
                {errorMessage(assignRolesMutation.error)}
              </p>
            ) : null}
            <div>
              <Button
                loading={assignRolesMutation.isPending}
                disabled={assignUserId.trim().length === 0 || assignRoleIds.length === 0}
                onClick={() =>
                  assignRolesMutation.mutate({
                    userId: assignUserId.trim(),
                    roleIds: assignRoleIds,
                  })
                }
              >
                Assign roles
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange} size="lg">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Key"
              value={createKey}
              onChange={(event) => setCreateKey(event.target.value)}
              placeholder="e.g. admissions_officer"
            />
            <Input
              label="Name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="e.g. Admissions Officer"
            />
          </div>
          <Textarea
            label="Description (optional)"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            placeholder="What this role is for"
            maxLength={300}
          />
          <div>
            <div className="mb-2 text-sm font-medium text-text-primary">Permissions</div>
            <PermissionGroups
              groups={groups}
              selected={createPermissions}
              onToggle={(permission) =>
                setCreatePermissions(togglePermission(createPermissions, permission))
              }
              onToggleGroup={(group) =>
                setCreatePermissions(togglePermissionGroup(createPermissions, group))
              }
            />
          </div>
          {createError ? <p className="text-sm text-accent-danger">{createError}</p> : null}
          {createRoleMutation.isError ? (
            <p className="text-sm text-accent-danger">{errorMessage(createRoleMutation.error)}</p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submitCreateRole}
            loading={createRoleMutation.isPending}
            disabled={createKey.trim().length === 0 || createName.trim().length === 0}
          >
            Create role
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete role"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}" (${deleteTarget.key})? Users holding this role will lose its permissions.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        isPending={deleteRoleMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteRoleMutation.mutate({ roleId: deleteTarget.id });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
