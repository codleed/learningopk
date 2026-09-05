"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  Layers,
  X,
  CheckCircle,
  FlipHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getAdminFlashcards,
  createAdminFlashcard,
  updateAdminFlashcard,
  deleteAdminFlashcard,
  reorderAdminFlashcards,
} from "@/lib/admin-api";
import type { FlashcardResponse } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type ChapterFlashcardManagerProps = {
  chapterId: number;
};

type FlashcardFormData = {
  front: string;
  back: string;
};

const initialFormData: FlashcardFormData = {
  front: "",
  back: "",
};

export function ChapterFlashcardManager({ chapterId }: ChapterFlashcardManagerProps) {
  const { pushToast } = useToast();
  const [flashcards, setFlashcards] = useState<FlashcardResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardResponse | null>(null);
  const [formData, setFormData] = useState<FlashcardFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({
    show: false,
  });
  const [reordering, setReordering] = useState<{ id: number; direction: "up" | "down" } | null>(
    null
  );

  const fetchFlashcards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminFlashcards(chapterId);
      // Sort by orderIndex
      const sorted = [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setFlashcards(sorted);
    } catch (error) {
      console.error("Failed to fetch flashcards:", error);
      pushToast({
        title: "Failed to load flashcards",
        description: "Please try again or contact support.",
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, pushToast]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const handleSave = async () => {
    if (!formData.front.trim() || !formData.back.trim()) {
      pushToast({
        title: "Validation Error",
        description: "Both front and back text are required",
        tone: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      if (editingFlashcard) {
        const updated = await updateAdminFlashcard({
          id: editingFlashcard.id,
          input: { front: formData.front, back: formData.back },
        });
        setFlashcards((prev) => prev.map((f) => (f.id === editingFlashcard.id ? updated.data : f)));
        pushToast({
          title: "Flashcard updated",
          tone: "success",
        });
      } else {
        const created = await createAdminFlashcard({
          chapterId,
          front: formData.front,
          back: formData.back,
          orderIndex: flashcards.length,
        });
        setFlashcards((prev) => [...prev, created.data]);
        pushToast({
          title: "Flashcard added",
          tone: "success",
        });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save flashcard:", error);
      pushToast({
        title: "Failed to save flashcard",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (flashcard: FlashcardResponse) => {
    setEditingFlashcard(flashcard);
    setFormData({ front: flashcard.front, back: flashcard.back });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteAdminFlashcard(deleteConfirm.id);
      setFlashcards((prev) => prev.filter((f) => f.id !== deleteConfirm.id));
      pushToast({
        title: "Flashcard deleted",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to delete flashcard:", error);
      pushToast({
        title: "Failed to delete flashcard",
        tone: "error",
      });
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newFlashcards = [...flashcards];
    [newFlashcards[index - 1], newFlashcards[index]] = [
      newFlashcards[index],
      newFlashcards[index - 1],
    ];
    setReordering({ id: flashcards[index].id, direction: "up" });
    setFlashcards(newFlashcards);

    try {
      await reorderAdminFlashcards({
        chapterId,
        flashcardIds: newFlashcards.map((f) => f.id),
      });
    } catch (error) {
      console.error("Failed to reorder flashcards:", error);
      pushToast({
        title: "Failed to save order",
        description: "Reverting to previous order",
        tone: "error",
      });
      fetchFlashcards();
    } finally {
      setReordering(null);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === flashcards.length - 1) return;
    const newFlashcards = [...flashcards];
    [newFlashcards[index], newFlashcards[index + 1]] = [
      newFlashcards[index + 1],
      newFlashcards[index],
    ];
    setReordering({ id: flashcards[index].id, direction: "down" });
    setFlashcards(newFlashcards);

    try {
      await reorderAdminFlashcards({
        chapterId,
        flashcardIds: newFlashcards.map((f) => f.id),
      });
    } catch (error) {
      console.error("Failed to reorder flashcards:", error);
      pushToast({
        title: "Failed to save order",
        description: "Reverting to previous order",
        tone: "error",
      });
      fetchFlashcards();
    } finally {
      setReordering(null);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingFlashcard(null);
    setShowForm(false);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Flashcards</h2>
            <p className="text-sm text-muted-foreground">
              {flashcards.length} {flashcards.length === 1 ? "card" : "cards"} in deck
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Flashcard
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {editingFlashcard ? "Edit Flashcard" : "Add New Flashcard"}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Flashcard Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Front (Question/Term) <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.front}
                  onChange={(e) => setFormData((prev) => ({ ...prev, front: e.target.value }))}
                  placeholder="Enter the front of the flashcard..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">What the student sees first</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Back (Answer/Definition) <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.back}
                  onChange={(e) => setFormData((prev) => ({ ...prev, back: e.target.value }))}
                  placeholder="Enter the back of the flashcard..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">The answer or explanation</p>
              </div>
            </div>

            {/* Mini Preview */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex-1 p-3 bg-card rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Front</p>
                <p className="text-sm truncate">{formData.front || "Card front..."}</p>
              </div>
              <div className="flex items-center justify-center">
                <FlipHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 p-3 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg">
                <p className="text-xs font-medium text-[var(--primary)] mb-1">Back</p>
                <p className="text-sm truncate">{formData.back || "Card back..."}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/5 border-t">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingFlashcard ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Update Flashcard
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Flashcard
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Flashcards List */}
      {flashcards.length === 0 && !showForm ? (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/5">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-muted/20 p-4 mb-4">
              <Layers className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium mb-1">No flashcards yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Create flashcards to help students learn key concepts through spaced repetition
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Flashcard
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {flashcards.map((flashcard, index) => (
            <div
              key={flashcard.id}
              className={cn(
                "group rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-200",
                "hover:shadow-md hover:border-[var(--primary)]/20",
                reordering?.id === flashcard.id && "opacity-60"
              )}
            >
              <div className="flex items-stretch">
                {/* Drag Handle / Order Controls */}
                <div className="flex flex-col border-r border-border bg-muted/10">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || reordering !== null}
                    className="flex-1 px-2 flex items-center justify-center hover:bg-muted/20 transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <div className="px-2 py-1 flex items-center justify-center border-t border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  </div>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === flashcards.length - 1 || reordering !== null}
                    className="flex-1 px-2 flex items-center justify-center hover:bg-muted/20 transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>

                {/* Card Content */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  {/* Front */}
                  <div className="p-4 bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Front
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed">{flashcard.front}</p>
                  </div>

                  {/* Back */}
                  <div className="p-4 bg-[var(--primary)]/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                      <p className="text-xs font-medium text-[var(--primary)] uppercase tracking-wider">
                        Back
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed">{flashcard.back}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 p-2 border-l border-border bg-muted/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(flashcard)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm({ show: true, id: flashcard.id })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.show}
        title="Delete Flashcard?"
        description="This flashcard will be permanently removed from the deck. This action cannot be undone."
        confirmLabel="Delete"
        danger
        isPending={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false })}
      />
    </div>
  );
}
