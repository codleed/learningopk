"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { resolveAdminModerationFlag, type AdminModerationFlag } from "@/lib/admin-api";

type ModerationResolveActionProps = {
  flagId: string;
  targetLabel: string;
  onResolved: (flag: AdminModerationFlag) => void;
};

export function ModerationResolveAction({
  flagId,
  targetLabel,
  onResolved,
}: ModerationResolveActionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [note, setNote] = useState("");
  const { pushToast } = useToast();
  const noteFieldId = `resolution-note-${flagId}`;

  const submitResolution = async () => {
    if (note.trim().length < 10) {
      pushToast({
        tone: "error",
        title: "Resolution note too short",
        description: "Please provide at least 10 characters before resolving.",
      });
      return;
    }

    setIsPending(true);
    try {
      const payload = await resolveAdminModerationFlag({
        id: flagId,
        note,
      });

      onResolved(payload.flag);
      pushToast({
        tone: "success",
        title: "Flag resolved",
        description: `Resolved moderation flag for "${targetLabel}".`,
      });
      setNote("");
      setIsExpanded(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to resolve moderation flag right now.";
      pushToast({
        tone: "error",
        title: "Resolve failed",
        description: message,
      });
    } finally {
      setIsPending(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setIsExpanded(true)}>
        Resolve
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={noteFieldId} className="text-xs font-semibold text-foreground">
        Resolution note
      </label>
      <Textarea
        id={noteFieldId}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Explain what was reviewed and how the report was resolved."
        className="min-h-20"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={submitResolution} disabled={isPending}>
          {isPending ? "Resolving..." : "Resolve flag"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            setIsExpanded(false);
            setNote("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
