"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "@/lib/admin-api";

type AdminUsersTableProps = {
  rows: AdminUser[];
  mutatingUserIds: Set<string>;
  suspensionMutatingUserIds: Set<string>;
  onToggleRole: (user: AdminUser) => Promise<void>;
  onSuspend: (user: AdminUser, reason: string) => Promise<boolean>;
  onReactivate: (user: AdminUser) => Promise<void>;
  onWarn: (user: AdminUser, reason: string) => Promise<void>;
  onTempBan: (user: AdminUser, reason: string, durationHours: number) => Promise<boolean>;
};

export function AdminUsersTable({
  rows,
  mutatingUserIds,
  suspensionMutatingUserIds,
  onToggleRole,
  onSuspend,
  onReactivate,
  onWarn,
  onTempBan
}: AdminUsersTableProps) {
  const [suspensionUserId, setSuspensionUserId] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [warnUserId, setWarnUserId] = useState<string | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [tempBanUserId, setTempBanUserId] = useState<string | null>(null);
  const [tempBanReason, setTempBanReason] = useState("");
  const [tempBanDuration, setTempBanDuration] = useState(24);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No users match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Role</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((user) => {
            const userStatus = user.status ?? "active";
            const isRoleMutating = mutatingUserIds.has(user.id);
            const isSuspensionMutating = suspensionMutatingUserIds.has(user.id);
            const isSuspensionEditing = suspensionUserId === user.id;

            return (
              <tr key={user.id} data-testid="admin-user-row">
              <td className="px-3 py-2 text-foreground">{user.name}</td>
              <td className="px-3 py-2 text-foreground/90">{user.email}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    user.role === "admin" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-secondary text-secondary-foreground"
                  ].join(" ")}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    userStatus === "suspended" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  ].join(" ")}
                >
                  {userStatus}
                </span>
              </td>
              <td className="px-3 py-2 text-foreground/90">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2">
                <div className="space-y-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => void onToggleRole(user)} disabled={isRoleMutating}>
                    {isRoleMutating ? "Saving..." : user.role === "admin" ? "Demote to student" : "Promote to admin"}
                  </Button>
                  {user.role === "student" ? (
                    userStatus === "suspended" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void onReactivate(user)}
                        disabled={isSuspensionMutating}
                      >
                        {isSuspensionMutating ? "Saving..." : "Reactivate"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSuspensionUserId(user.id);
                          setSuspensionReason("");
                        }}
                        disabled={isSuspensionMutating}
                      >
                        Suspend
                      </Button>
                    )
                  ) : null}
                  {isSuspensionEditing ? (
                    <div className="space-y-2">
                      <label
                        htmlFor={`suspension-reason-${user.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-foreground"
                      >
                        Suspension reason
                      </label>
                      <Input
                        id={`suspension-reason-${user.id}`}
                        aria-label="Suspension reason"
                        value={suspensionReason}
                        onChange={(event) => setSuspensionReason(event.target.value)}
                        disabled={isSuspensionMutating}
                        minLength={10}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            const success = await onSuspend(user, suspensionReason.trim());
                            if (success) {
                              setSuspensionUserId(null);
                              setSuspensionReason("");
                            }
                          }}
                          disabled={isSuspensionMutating || suspensionReason.trim().length < 10}
                        >
                          Confirm suspension
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSuspensionUserId(null);
                            setSuspensionReason("");
                          }}
                          disabled={isSuspensionMutating}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {user.role === "student" && userStatus === "active" ? (
                    <>
                      {warnUserId === user.id ? (
                        <div className="space-y-2">
                          <label
                            htmlFor={`warn-reason-${user.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-foreground"
                          >
                            Warning reason
                          </label>
                          <Input
                            id={`warn-reason-${user.id}`}
                            aria-label="Warning reason"
                            value={warnReason}
                            onChange={(event) => setWarnReason(event.target.value)}
                            minLength={10}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                await onWarn(user, warnReason.trim());
                                setWarnUserId(null);
                                setWarnReason("");
                              }}
                              disabled={warnReason.trim().length < 10}
                            >
                              Confirm warn
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setWarnUserId(null);
                                setWarnReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setWarnUserId(user.id);
                            setWarnReason("");
                          }}
                        >
                          Warn
                        </Button>
                      )}
                      {tempBanUserId === user.id ? (
                        <div className="space-y-2">
                          <label
                            htmlFor={`temp-ban-reason-${user.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-foreground"
                          >
                            Ban reason
                          </label>
                          <Input
                            id={`temp-ban-reason-${user.id}`}
                            aria-label="Temp ban reason"
                            value={tempBanReason}
                            onChange={(event) => setTempBanReason(event.target.value)}
                            minLength={10}
                          />
                          <label
                            htmlFor={`temp-ban-duration-${user.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-foreground"
                          >
                            Duration
                          </label>
                          <Select
                            id={`temp-ban-duration-${user.id}`}
                            value={String(tempBanDuration)}
                            onChange={(event) => setTempBanDuration(Number(event.target.value))}
                          >
                            <option value="1">1 hour</option>
                            <option value="6">6 hours</option>
                            <option value="12">12 hours</option>
                            <option value="24">24 hours</option>
                            <option value="72">3 days</option>
                            <option value="168">1 week</option>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                const success = await onTempBan(user, tempBanReason.trim(), tempBanDuration);
                                if (success) {
                                  setTempBanUserId(null);
                                  setTempBanReason("");
                                  setTempBanDuration(24);
                                }
                              }}
                              disabled={tempBanReason.trim().length < 10}
                            >
                              Confirm temp ban
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTempBanUserId(null);
                                setTempBanReason("");
                                setTempBanDuration(24);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setTempBanUserId(user.id);
                            setTempBanReason("");
                            setTempBanDuration(24);
                          }}
                        >
                          Temp Ban
                        </Button>
                      )}
                    </>
                  ) : null}
                </div>
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
