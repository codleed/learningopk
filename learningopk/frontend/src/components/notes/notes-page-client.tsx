"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  NotebookPen,
  Eye,
  Pencil,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
  Code,
  Quote,
  Sigma,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import {
  createNote,
  updateNote,
  deleteNote,
  type StudentNote,
} from "@/lib/notes-api";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

type EditorMode = "edit" | "preview";

type NoteFormState = {
  title: string;
  content: string;
  tags: string[];
};

/* ═══════════════════════════════════════════
   Markdown Toolbar
   ═══════════════════════════════════════════ */

function MarkdownToolbar({
  textareaRef,
  onContentChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onContentChange: (value: string) => void;
}) {
  const insertMarkdown = useCallback(
    (before: string, after: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const insertText = selectedText || placeholder;
      const newValue =
        textarea.value.substring(0, start) +
        before +
        insertText +
        after +
        textarea.value.substring(end);

      onContentChange(newValue);

      // Re-focus and place cursor
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + before.length + insertText.length;
        textarea.setSelectionRange(
          selectedText ? cursorPos + after.length : start + before.length,
          selectedText ? cursorPos + after.length : cursorPos
        );
      });
    },
    [textareaRef, onContentChange]
  );

  const tools = [
    { icon: Bold, label: "Bold", before: "**", after: "**", placeholder: "bold text" },
    { icon: Italic, label: "Italic", before: "_", after: "_", placeholder: "italic text" },
    { icon: Heading2, label: "Heading", before: "## ", after: "", placeholder: "Heading" },
    { icon: List, label: "Bullet List", before: "- ", after: "", placeholder: "list item" },
    { icon: ListOrdered, label: "Numbered List", before: "1. ", after: "", placeholder: "list item" },
    { icon: Code, label: "Code", before: "`", after: "`", placeholder: "code" },
    { icon: Quote, label: "Quote", before: "> ", after: "", placeholder: "quote" },
    { icon: ImageIcon, label: "Image", before: "![alt](", after: ")", placeholder: "url" },
    { icon: Sigma, label: "Math (inline)", before: "$", after: "$", placeholder: "x^2 + y^2 = z^2" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-border-default bg-bg-subtle/50 px-2 py-1.5">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={() => insertMarkdown(tool.before, tool.after, tool.placeholder)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          title={tool.label}
          aria-label={tool.label}
        >
          <tool.icon className="h-3.5 w-3.5" />
        </button>
      ))}

      <div className="mx-1 h-4 w-px bg-border-default" />

      <button
        type="button"
        onClick={() => insertMarkdown("$$\n", "\n$$", "E = mc^2")}
        className="inline-flex h-7 items-center justify-center rounded-md px-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        title="Math Block"
        aria-label="Math Block"
      >
        $$
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Note Editor
   ═══════════════════════════════════════════ */

function NoteEditor({
  note,
  onSave,
  onCancel,
  isSaving,
}: {
  note: StudentNote | null;
  onSave: (data: NoteFormState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<NoteFormState>({
    title: note?.title ?? "",
    content: note?.content ?? "",
    tags: note?.tags ?? [],
  });
  const [mode, setMode] = useState<EditorMode>("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    onSave(form);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary sm:hidden"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Note title..."
          className="flex-1 bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none"
          maxLength={500}
        />

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-lg border border-border-default bg-bg-subtle p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "edit"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === "preview"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            disabled={!form.title.trim() || !form.content.trim()}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="flex items-center gap-0.5 border-b border-border-default bg-bg-subtle p-1.5 sm:hidden">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "edit"
              ? "bg-bg-surface text-text-primary shadow-sm"
              : "text-text-muted"
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "preview"
              ? "bg-bg-surface text-text-primary shadow-sm"
              : "text-text-muted"
          )}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === "edit" ? (
          <div className="p-4 sm:p-6">
            <MarkdownToolbar
              textareaRef={textareaRef}
              onContentChange={(val) => setForm((prev) => ({ ...prev, content: val }))}
            />
            <textarea
              ref={textareaRef}
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Write your note in markdown... Use $ for inline math, $$ for block math."
              className="min-h-[400px] w-full resize-none rounded-b-lg border border-border-default bg-bg-surface px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {form.content.trim() ? (
              <div className="rounded-xl border border-border-default/50 bg-bg-surface p-6">
                <MarkdownRenderer content={form.content} />
              </div>
            ) : (
              <p className="text-sm text-text-muted">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Notes Sidebar Item
   ═══════════════════════════════════════════ */

function NoteListItem({
  note,
  isActive,
  onSelect,
  onDelete,
}: {
  note: StudentNote;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const snippet = useMemo(() => {
    const plain = note.content.replace(/[#*_`~>$[\]()!]/g, "").trim();
    return plain.length > 100 ? `${plain.slice(0, 100)}…` : plain;
  }, [note.content]);

  const formattedDate = useMemo(() => {
    const d = new Date(note.updatedAt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [note.updatedAt]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group cursor-pointer rounded-xl border p-3 transition-all duration-150",
        isActive
          ? "border-accent-primary/40 bg-accent-primary/5 shadow-sm"
          : "border-border-default/50 bg-bg-surface hover:border-border-strong hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-text-primary">
          {note.title}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded-md p-1 text-text-muted opacity-0 transition-all hover:bg-accent-danger/10 hover:text-accent-danger group-hover:opacity-100"
          aria-label={`Delete "${note.title}"`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{snippet}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-text-muted">{formattedDate}</span>
        {note.subjectName ? (
          <span className="rounded-full bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
            {note.subjectName}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Notes Page Client
   ═══════════════════════════════════════════ */

type NotesPageClientProps = {
  initialNotes: StudentNote[];
};

export function NotesPageClient({ initialNotes }: NotesPageClientProps) {
  const { pushToast } = useToast();
  const [notes, setNotes] = useState<StudentNote[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudentNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  );

  // Filter notes by search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.subjectName?.toLowerCase().includes(q) ||
        n.chapterTitle?.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // Create note
  const handleCreate = useCallback(() => {
    setSelectedNoteId(null);
    setIsCreating(true);
  }, []);

  const handleSaveNew = useCallback(
    async (form: NoteFormState) => {
      setIsSaving(true);
      try {
        const created = await createNote({
          title: form.title,
          content: form.content,
          tags: form.tags,
        });
        setNotes((prev) => [created, ...prev]);
        setSelectedNoteId(created.id);
        setIsCreating(false);
        pushToast({ title: "Note created", tone: "success" });
      } catch {
        pushToast({ title: "Failed to create note", tone: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [pushToast]
  );

  // Update note
  const handleSaveExisting = useCallback(
    async (form: NoteFormState) => {
      if (!selectedNoteId) return;
      setIsSaving(true);
      try {
        const updated = await updateNote(selectedNoteId, {
          title: form.title,
          content: form.content,
          tags: form.tags,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === selectedNoteId ? updated : n))
        );
        pushToast({ title: "Note saved", tone: "success" });
      } catch {
        pushToast({ title: "Failed to save note", tone: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [selectedNoteId, pushToast]
  );

  // Delete note
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteNote(deleteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      if (selectedNoteId === deleteTarget.id) {
        setSelectedNoteId(null);
        setIsCreating(false);
      }
      pushToast({ title: "Note deleted", tone: "success" });
    } catch {
      pushToast({ title: "Failed to delete note", tone: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, selectedNoteId, pushToast]);

  const handleCancelEditor = useCallback(() => {
    setIsCreating(false);
    setSelectedNoteId(null);
  }, []);

  const showEditor = isCreating || selectedNoteId !== null;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-0 overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[var(--shadow-sm)]">
      {/* ── Sidebar ── */}
      <div
        className={cn(
          "flex w-full flex-col border-r border-border-default sm:w-72 lg:w-80",
          showEditor && "hidden sm:flex"
        )}
      >
        {/* Search + Create */}
        <div className="space-y-2 border-b border-border-default p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            width="full"
            onClick={handleCreate}
            iconLeft={<Plus />}
          >
            New Note
          </Button>
        </div>

        {/* Notes list */}
        <div className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <NotebookPen className="mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-secondary">
                {searchQuery ? "No notes match your search." : "No notes yet. Create one!"}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isActive={selectedNoteId === note.id}
                onSelect={() => {
                  setIsCreating(false);
                  setSelectedNoteId(note.id);
                }}
                onDelete={() => setDeleteTarget(note)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Editor / Placeholder ── */}
      <div
        className={cn(
          "flex-1",
          !showEditor && "hidden sm:flex sm:items-center sm:justify-center"
        )}
      >
        {isCreating ? (
          <NoteEditor
            key="new"
            note={null}
            onSave={handleSaveNew}
            onCancel={handleCancelEditor}
            isSaving={isSaving}
          />
        ) : selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onSave={handleSaveExisting}
            onCancel={handleCancelEditor}
            isSaving={isSaving}
          />
        ) : (
          <EmptyState
            icon={<NotebookPen className="h-6 w-6" />}
            title="Select a note"
            description="Choose a note from the sidebar or create a new one to get started."
            action={
              <Button onClick={handleCreate} size="sm" iconLeft={<Plus />}>
                New Note
              </Button>
            }
          />
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete note?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        danger
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
