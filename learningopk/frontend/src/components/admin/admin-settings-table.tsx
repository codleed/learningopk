"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminSetting } from "@/lib/admin-api";

type AdminSettingsTableProps = {
  rows: AdminSetting[];
  draftValues: Record<string, string>;
  savingKeys: Set<string>;
  onValueChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
};

export function AdminSettingsTable({ rows, draftValues, savingKeys, onValueChange, onSave }: AdminSettingsTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No settings available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Key</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Value</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Description</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Updated</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const inputId = `setting-value-${row.key}`;
            const draftValue = draftValues[row.key] ?? row.value;
            const isSaving = savingKeys.has(row.key);
            return (
              <tr key={row.key} data-testid="admin-setting-row">
                <td className="px-3 py-2 text-foreground">
                  <p className="font-medium">{row.key}</p>
                </td>
                <td className="px-3 py-2 text-foreground">
                  <label htmlFor={inputId} className="sr-only">
                    Setting value
                  </label>
                  <Input
                    id={inputId}
                    aria-label="Setting value"
                    value={draftValue}
                    onChange={(event) => onValueChange(row.key, event.target.value)}
                    disabled={isSaving}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Current: {draftValue}</p>
                </td>
                <td className="px-3 py-2 text-foreground/90">{row.description}</td>
                <td className="px-3 py-2 text-foreground/90">
                  <p>{new Date(row.updatedAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{row.updatedBy?.name ?? "System"}</p>
                </td>
                <td className="px-3 py-2">
                  <Button type="button" size="sm" variant="secondary" disabled={isSaving} onClick={() => onSave(row.key)}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
