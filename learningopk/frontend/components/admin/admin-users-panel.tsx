"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAdminUsers, type AdminUser } from "@/lib/admin-api";

import { AdminUsersTable } from "./admin-users-table";

type UsersRoleFilter = "" | "student" | "admin";

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
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
        role
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
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
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
          <Button type="button" variant="secondary" onClick={() => void applyFilters()} disabled={isApplying}>
            {isApplying ? "Applying..." : "Apply filters"}
          </Button>
        </div>

        <AdminUsersTable rows={entries} />
      </div>
    </SectionCard>
  );
}
