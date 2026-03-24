"use client";

import { useState } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAdminSettings, updateAdminSetting, type AdminSetting, type AdminSettingsResponse } from "@/lib/admin-api";

import { AdminSettingsTable } from "./admin-settings-table";

type AdminSettingsPanelProps = {
  initialPayload: AdminSettingsResponse;
};

const settingsPageSize = 20;

const toDraftMap = (rows: AdminSetting[]): Record<string, string> =>
  rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

export function AdminSettingsPanel({ initialPayload }: AdminSettingsPanelProps) {
  const [entries, setEntries] = useState(initialPayload.entries);
  const [total, setTotal] = useState(initialPayload.total);
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => toDraftMap(initialPayload.entries));
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pushToast } = useToast();

  const refreshList = async () => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminSettings({
        page: 1,
        pageSize: settingsPageSize
      });
      setEntries(payload.entries);
      setTotal(payload.total);
      setDraftValues(toDraftMap(payload.entries));
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to refresh settings.";
      pushToast({
        tone: "error",
        title: "Settings unavailable",
        description
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onSave = async (key: string) => {
    const nextValue = (draftValues[key] ?? "").trim();
    if (!nextValue) {
      pushToast({
        tone: "error",
        title: "Invalid value",
        description: "Setting value cannot be empty."
      });
      return;
    }

    setSavingKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      await updateAdminSetting({
        key,
        value: nextValue
      });
      pushToast({
        tone: "success",
        title: "Setting saved",
        description: `${key} updated successfully.`
      });
      await refreshList();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to update setting.";
      pushToast({
        tone: "error",
        title: "Save failed",
        description
      });
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <SectionCard
      title="Settings Registry"
      description={`Manage allowlisted key/value pairs (${entries.length} of ${total}).`}
      actions={
        <Button type="button" size="sm" variant="secondary" onClick={() => void refreshList()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <AdminSettingsTable
        rows={entries}
        draftValues={draftValues}
        savingKeys={savingKeys}
        onValueChange={(key, value) => setDraftValues((prev) => ({ ...prev, [key]: value }))}
        onSave={(key) => void onSave(key)}
      />
    </SectionCard>
  );
}
