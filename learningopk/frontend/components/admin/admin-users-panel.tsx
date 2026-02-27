"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminUsers, type AdminUser, updateAdminUserRole, updateAdminUserSuspension } from "@/lib/admin-api";

import { AdminUsersTable } from "./admin-users-table";

type UsersRoleFilter = "" | "student" | "admin";
type UsersStatusFilter = "" | "active" | "suspended";

type AdminUsersPanelProps = {
  initialEntries: AdminUser[];
  initialTotal: number;
};

const usersPageSize = 10;

export function AdminUsersPanel({ initialEntries, initialTotal }: AdminUsersPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<UsersRoleFilter>("");
  const [status, setStatus] = useState<UsersStatusFilter>("");
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mutatingUserIds, setMutatingUserIds] = useState<Set<string>>(new Set());
  const [suspensionMutatingUserIds, setSuspensionMutatingUserIds] = useState<Set<string>>(new Set());
  const { pushToast } = useToast();
  const hasMore = entries.length < total;

  const runFetch = async ({
    nextPage,
    append
  }: {
    nextPage: number;
    append: boolean;
  }) => {
    try {
      const payload = await getAdminUsers({
        page: nextPage,
        pageSize: usersPageSize,
        q: searchTerm,
        role,
        status
      });

      setEntries((previous) => (append ? [...previous, ...payload.entries] : payload.entries));
      setTotal(payload.total);
      setPage(payload.page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load users.";
      pushToast({
        tone: "error",
        title: "Users directory unavailable",
        description: message
      });
    }
  };

  const applyFilters = async () => {
    setIsApplying(true);
    try {
      await runFetch({
        nextPage: 1,
        append: false
      });
    } finally {
      setIsApplying(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await runFetch({
        nextPage: page + 1,
        append: true
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleRole = async (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "student" : "admin";

    setMutatingUserIds((previous) => {
      const next = new Set(previous);
      next.add(user.id);
      return next;
    });

    try {
      await updateAdminUserRole({
        id: user.id,
        role: nextRole
      });
      pushToast({
        tone: "success",
        title: "Role updated",
        description: `${user.name} is now ${nextRole}.`
      });
      await runFetch({
        nextPage: 1,
        append: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update user role.";
      pushToast({
        tone: "error",
        title: "Role update failed",
        description: message
      });
    } finally {
      setMutatingUserIds((previous) => {
        const next = new Set(previous);
        next.delete(user.id);
        return next;
      });
    }
  };

  const suspendUser = async (user: AdminUser, reason: string): Promise<boolean> => {
    setSuspensionMutatingUserIds((previous) => {
      const next = new Set(previous);
      next.add(user.id);
      return next;
    });

    try {
      await updateAdminUserSuspension({
        id: user.id,
        action: "suspend",
        reason
      });
      pushToast({
        tone: "success",
        title: "User suspended",
        description: `${user.name} has been suspended.`
      });
      await runFetch({
        nextPage: 1,
        append: false
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to suspend user.";
      pushToast({
        tone: "error",
        title: "Suspension failed",
        description: message
      });
      return false;
    } finally {
      setSuspensionMutatingUserIds((previous) => {
        const next = new Set(previous);
        next.delete(user.id);
        return next;
      });
    }
  };

  const reactivateUser = async (user: AdminUser) => {
    setSuspensionMutatingUserIds((previous) => {
      const next = new Set(previous);
      next.add(user.id);
      return next;
    });

    try {
      await updateAdminUserSuspension({
        id: user.id,
        action: "reactivate"
      });
      pushToast({
        tone: "success",
        title: "User reactivated",
        description: `${user.name} has been reactivated.`
      });
      await runFetch({
        nextPage: 1,
        append: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reactivate user.";
      pushToast({
        tone: "error",
        title: "Reactivation failed",
        description: message
      });
    } finally {
      setSuspensionMutatingUserIds((previous) => {
        const next = new Set(previous);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <SectionCard
      title="Users Directory"
      description="Search users by name or email and filter by role."
      actions={
        hasMore ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadMore()} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
          <div className="space-y-1.5">
            <label htmlFor="users-search" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Search users
            </label>
            <Input
              id="users-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name or email"
              disabled={isApplying}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="users-role" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Role
            </label>
            <Select id="users-role" value={role} onChange={(event) => setRole(event.target.value as UsersRoleFilter)} disabled={isApplying}>
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="users-status" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Status
            </label>
            <Select
              id="users-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as UsersStatusFilter)}
              disabled={isApplying}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={() => void applyFilters()} disabled={isApplying}>
            {isApplying ? "Applying..." : "Apply filters"}
          </Button>
        </div>

        <AdminUsersTable
          rows={entries}
          mutatingUserIds={mutatingUserIds}
          suspensionMutatingUserIds={suspensionMutatingUserIds}
          onToggleRole={toggleRole}
          onSuspend={suspendUser}
          onReactivate={reactivateUser}
        />
      </div>
    </SectionCard>
  );
}
