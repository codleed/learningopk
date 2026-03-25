"use client";

import { useCallback, useState } from "react";
import { Shield, Eye, EyeSlash, Users, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { BlockedUser, PrivacySettings } from "@/lib/friends-api";

type PrivacySettingsFormProps = {
  settings: PrivacySettings;
  blockedUsers: BlockedUser[];
  onUpdateSettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  onUnblock: (userId: string) => Promise<void>;
  isLoading?: boolean;
};

export function PrivacySettingsForm({
  settings,
  blockedUsers,
  onUpdateSettings,
  onUnblock,
  isLoading = false,
}: PrivacySettingsFormProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectChange = useCallback(async (field: keyof PrivacySettings, value: string) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);

    setIsSaving(true);
    try {
      await onUpdateSettings({ [field]: value });
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, onUpdateSettings]);

  const handleToggle = useCallback(async (field: keyof PrivacySettings) => {
    const newSettings = { ...localSettings, [field]: !localSettings[field] };
    setLocalSettings(newSettings);

    setIsSaving(true);
    try {
      await onUpdateSettings({ [field]: !localSettings[field] });
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, onUpdateSettings]);

  const handleUnblockClick = useCallback((user: BlockedUser) => {
    setUserToUnblock(user);
    setShowUnblockDialog(true);
  }, []);

  const handleConfirmUnblock = useCallback(async () => {
    if (userToUnblock) {
      await onUnblock(userToUnblock.userId);
      setShowUnblockDialog(false);
      setUserToUnblock(null);
    }
  }, [userToUnblock, onUnblock]);

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[var(--primary)]" weight="fill" />
          <h2 className="text-xl font-semibold">Privacy Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Who can find me
            </label>
            <Select
              value={localSettings.whoCanFindMe}
              onChange={(e) => handleSelectChange("whoCanFindMe", e.target.value)}
              disabled={isSaving}
            >
              <option value="everyone">Everyone</option>
              <option value="friends_of_friends">Friends of Friends</option>
              <option value="nobody">Nobody</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls who can search and find your profile
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              Who can send me friend requests
            </label>
            <Select
              value={localSettings.whoCanSendFriendRequests}
              onChange={(e) => handleSelectChange("whoCanSendFriendRequests", e.target.value)}
              disabled={isSaving}
            >
              <option value="everyone">Everyone</option>
              <option value="friends_of_friends">Friends of Friends</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls who can send you friend requests
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {localSettings.showOnlineStatus ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeSlash className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Show online status</p>
                <p className="text-xs text-muted-foreground">Let others see when you&apos;re online</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={localSettings.showOnlineStatus}
              onClick={() => handleToggle("showOnlineStatus")}
              disabled={isSaving}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2",
                localSettings.showOnlineStatus ? "bg-[var(--primary)]" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                  localSettings.showOnlineStatus ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              {localSettings.showLastSeen ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeSlash className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Show last seen</p>
                <p className="text-xs text-muted-foreground">Let others see when you were last active</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={localSettings.showLastSeen}
              onClick={() => handleToggle("showLastSeen")}
              disabled={isSaving}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2",
                localSettings.showLastSeen ? "bg-[var(--primary)]" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                  localSettings.showLastSeen ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Blocked Users</h3>
        {blockedUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No blocked users</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {blockedUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUnblockClick(user)}
                  disabled={isLoading}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={showUnblockDialog}
        title="Unblock user?"
        description={`Are you sure you want to unblock ${userToUnblock?.name}? They will be able to send you friend requests again.`}
        confirmLabel="Unblock"
        onConfirm={handleConfirmUnblock}
        onCancel={() => {
          setShowUnblockDialog(false);
          setUserToUnblock(null);
        }}
        isPending={isLoading}
      />
    </div>
  );
}
