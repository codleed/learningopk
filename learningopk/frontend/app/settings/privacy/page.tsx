"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { PrivacySettingsForm } from "@/components/friends/privacy-settings-form";
import {
  getPrivacySettings,
  updatePrivacySettings,
  getBlockedUsers,
  unblockUser,
  type PrivacySettings,
  type BlockedUser,
} from "@/lib/friends-api";

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settingsData, blockedData] = await Promise.all([
        getPrivacySettings(),
        getBlockedUsers(),
      ]);

      setSettings(settingsData);
      setBlockedUsers(blockedData.blockedUsers);
    } catch {
      setError("Failed to load privacy settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateSettings = useCallback(async (newSettings: Partial<PrivacySettings>) => {
    startTransition(async () => {
      try {
        const updated = await updatePrivacySettings(newSettings);
        setSettings(updated);
      } catch {
        console.error("Failed to update settings");
      }
    });
  }, []);

  const handleUnblock = useCallback(async (userId: string) => {
    startTransition(async () => {
      try {
        await unblockUser(userId);
        setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
      } catch {
        console.error("Failed to unblock user");
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Privacy Settings</h1>
          <p className="text-muted-foreground mt-1">
            Control who can find you and see your activity
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} variant="card" />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : settings ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <PrivacySettingsForm
            settings={settings}
            blockedUsers={blockedUsers}
            onUpdateSettings={handleUpdateSettings}
            onUnblock={handleUnblock}
            isLoading={isPending}
          />
        </div>
      ) : null}
    </div>
  );
}
