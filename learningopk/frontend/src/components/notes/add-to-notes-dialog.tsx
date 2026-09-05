"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createNote } from "@/lib/notes-api";

type AddToNotesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  subjectId?: number | null;
  chapterId?: number | null;
  suggestedTitle?: string;
};

export function AddToNotesDialog({
  open,
  onOpenChange,
  initialContent,
  subjectId,
  chapterId,
  suggestedTitle,
}: AddToNotesDialogProps) {
  const { pushToast } = useToast();
  const [title, setTitle] = useState(suggestedTitle ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Reset title when dialog opens with new content
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setTitle(suggestedTitle ?? "");
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, suggestedTitle]
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await createNote({
        title: title.trim(),
        content: initialContent,
        subjectId: subjectId ?? null,
        chapterId: chapterId ?? null,
      });
      pushToast({ title: "Saved to notes", tone: "success" });
      onOpenChange(false);
    } catch {
      pushToast({ title: "Failed to save note", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }, [title, initialContent, subjectId, chapterId, pushToast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} size="sm">
      <DialogHeader>
        <DialogTitle>Add to Notes</DialogTitle>
        <DialogDescription>Save this content as a new note.</DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3">
        <Input
          label="Note Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for this note..."
          maxLength={500}
          autoFocus
        />

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-text-primary">Preview</span>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border-default bg-bg-subtle/50 p-3 text-sm text-text-secondary">
            {initialContent.length > 300 ? `${initialContent.slice(0, 300)}…` : initialContent}
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} loading={isSaving} disabled={!title.trim()}>
          Save Note
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
