"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, GripVertical } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  createAdminPastPaper,
  updateAdminPastPaper,
  getLinkedExercises,
  linkExercisesToPaper,
  unlinkExerciseFromPaper,
  getAdminCurriculumExercises,
  type AdminCurriculumBoard,
  type PastPaperResponse,
  type LinkedExercise,
  type AdminCurriculumExerciseRead,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

interface PastPaperFormProps {
  boards: AdminCurriculumBoard[];
  existingPaper?: PastPaperResponse;
}

export function PastPaperForm({ boards, existingPaper }: PastPaperFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const isEdit = !!existingPaper;

  const boardOptions = useMemo(() => {
    return boards.map((board) => ({
      id: board.id,
      label: board.name
    }));
  }, [boards]);

  const subjectOptions = useMemo(() => {
    const options: Array<{ id: number; label: string }> = [];
    for (const board of boards) {
      for (const boardClass of board.classes) {
        for (const subject of boardClass.subjects) {
          options.push({
            id: subject.id,
            label: `${board.name} / ${boardClass.name} / ${subject.name}`,
          });
        }
      }
    }
    return options;
  }, [boards]);

  const [title, setTitle] = useState(existingPaper?.title ?? "");
  const [boardId, setBoardId] = useState<string>(existingPaper?.boardId?.toString() ?? "");
  const [grade, setGrade] = useState<string>(existingPaper?.grade ?? "");
  const [subjectId, setSubjectId] = useState<string>(existingPaper?.subjectId?.toString() ?? "");
  const [year, setYear] = useState<string>(existingPaper?.year?.toString() ?? "");
  const [paperContent, setPaperContent] = useState(existingPaper?.paperContent ?? "");
  const [solutionContent, setSolutionContent] = useState(existingPaper?.solutionContent ?? "");
  const [description, setDescription] = useState(existingPaper?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState<string>(existingPaper?.durationMinutes?.toString() ?? "60");
  const [totalMarks, setTotalMarks] = useState<string>(existingPaper?.totalMarks?.toString() ?? "0");
  const [published, setPublished] = useState(existingPaper?.published ?? false);
  const [showPreview, setShowPreview] = useState(false);

  const [linkedExercises, setLinkedExercises] = useState<LinkedExercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<AdminCurriculumExerciseRead[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Set<number>>(new Set());
  const [exerciseSearch, setExerciseSearch] = useState("");

  const [titleError, setTitleError] = useState("");
  const [boardError, setBoardError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [yearError, setYearError] = useState("");
  const [paperContentError, setPaperContentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && existingPaper) {
      setIsLoadingExercises(true);
      getLinkedExercises(existingPaper.id)
        .then(setLinkedExercises)
        .catch(() => {})
        .finally(() => setIsLoadingExercises(false));
    }
  }, [isEdit, existingPaper]);

  const validateForm = (): boolean => {
    let hasError = false;
    if (!title.trim()) { setTitleError("Title is required"); hasError = true; } else { setTitleError(""); }
    if (!boardId) { setBoardError("Board is required"); hasError = true; } else { setBoardError(""); }
    if (!grade) { setGradeError("Grade is required"); hasError = true; } else { setGradeError(""); }
    if (!subjectId) { setSubjectError("Subject is required"); hasError = true; } else { setSubjectError(""); }
    if (!year.trim()) { setYearError("Year is required"); hasError = true; } else {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2099) { setYearError("Year must be between 2000 and 2099"); hasError = true; } else { setYearError(""); }
    }
    setPaperContentError("");
    return !hasError;
  };

  const loadExercisesForPicker = async () => {
    try {
      const resp = await getAdminCurriculumExercises({});
      setAvailableExercises(resp.exercises ?? []);
    } catch { /* ignore */ }
  };

  const handleAddExercises = async () => {
    if (selectedExercises.size === 0) return;
    const newExercises = Array.from(selectedExercises).map((id, idx) => ({
      exerciseId: id,
      orderIndex: linkedExercises.length + idx,
    } as const));

    if (isEdit && existingPaper) {
      try {
        await linkExercisesToPaper(existingPaper.id, newExercises);
        const updated = await getLinkedExercises(existingPaper.id);
        setLinkedExercises(updated);
        pushToast({ title: "Exercises added", description: `${newExercises.length} exercises linked.`, tone: "success" });
      } catch (err) {
        pushToast({ title: "Error", description: err instanceof Error ? err.message : "Failed to link exercises", tone: "error" });
      }
    } else {
      setLinkedExercises(prev => {
        const next = [...prev];
        for (const ex of newExercises) {
          if (!next.find(n => n.id === ex.exerciseId)) {
            const avail = availableExercises.find(a => a.id === ex.exerciseId);
            if (avail) {
              next.push({ id: avail.id, exerciseNumber: String(avail.exerciseNumber ?? ""), question: avail.question ?? "", difficulty: avail.difficulty ?? "medium", type: avail.type ?? "mcq", orderIndex: ex.orderIndex, marks: null });
            }
          }
        }
        return next;
      });
    }
    setShowExercisePicker(false);
    setSelectedExercises(new Set());
    setExerciseSearch("");
  };

  const handleRemoveExercise = async (exerciseId: number) => {
    if (isEdit && existingPaper) {
      try {
        await unlinkExerciseFromPaper(existingPaper.id, exerciseId);
        setLinkedExercises(prev => prev.filter(e => e.id !== exerciseId));
        pushToast({ title: "Exercise removed", tone: "success" });
      } catch (err) {
        pushToast({ title: "Error", description: err instanceof Error ? err.message : "Failed to remove exercise", tone: "error" });
      }
    } else {
      setLinkedExercises(prev => prev.filter(e => e.id !== exerciseId));
    }
  };

  const filteredAvailableExercises = useMemo(() => {
    let results = availableExercises;
    if (exerciseSearch) {
      const q = exerciseSearch.toLowerCase();
      results = results.filter(e => (e.question ?? "").toLowerCase().includes(q) || (e.exerciseNumber ?? "").toLowerCase().includes(q));
    }
    return results.slice(0, 50);
  }, [availableExercises, exerciseSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      boardId: parseInt(boardId, 10),
      grade: grade as "9" | "10",
      subjectId: parseInt(subjectId, 10),
      year: parseInt(year, 10),
      paperContent: paperContent.trim() || undefined,
      solutionContent: solutionContent.trim() || undefined,
      description: description.trim() || undefined,
      durationMinutes: parseInt(durationMinutes, 10) || 60,
      totalMarks: parseInt(totalMarks, 10) || 0,
      published,
      exercises: linkedExercises.map((ex, idx) => ({
        exerciseId: ex.id,
        orderIndex: idx,
        marks: ex.marks ?? undefined,
      })),
    };

    try {
      if (isEdit && existingPaper) {
        await updateAdminPastPaper({ id: existingPaper.id, input: { ...payload, paperContent: payload.paperContent ?? "" } });
        pushToast({ title: "Past paper updated", description: `"${title.trim()}" has been updated.`, tone: "success" });
      } else {
        await createAdminPastPaper({ ...payload, paperContent: payload.paperContent ?? "" });
        pushToast({ title: "Past paper created", description: `"${title.trim()}" has been created.`, tone: "success" });
      }
      router.push("/admin/content/past-papers");
    } catch (error) {
      pushToast({ title: "Error", description: error instanceof Error ? error.message : `Failed to ${isEdit ? "update" : "create"} past paper`, tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <AdminBreadcrumb
          segments={[
            { label: "Admin", href: "/admin" },
            { label: "Content", href: "/admin/content" },
            { label: "Past Papers", href: "/admin/content/past-papers" },
            { label: isEdit ? `Edit "${existingPaper?.title}"` : "Add Past Paper" },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title={isEdit ? "Edit Past Paper" : "Add Past Paper"}
        subtitle={isEdit ? "Update the past paper details and exercises below." : "Create a new past paper. Add markdown content and/or link exercises for students to attempt."}
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormField id="pp-title" label="Title" required error={titleError} hint="e.g., Physics Paper 1 - May 2024">
            <input id="pp-title" type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(""); }} placeholder="e.g., Physics Paper 1 - May 2024" className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
          </AdminFormField>

          <AdminFormField id="pp-board" label="Board" required error={boardError}>
            <Select id="pp-board" value={boardId} onChange={(e) => { setBoardId(e.target.value); setBoardError(""); }} aria-invalid={!!boardError}>
              <option value="">Select a board</option>
              {boardOptions.map((opt) => (<option key={opt.id} value={opt.id.toString()}>{opt.label}</option>))}
            </Select>
          </AdminFormField>

          <AdminFormField id="pp-grade" label="Grade" required error={gradeError}>
            <Select id="pp-grade" value={grade} onChange={(e) => { setGrade(e.target.value); setGradeError(""); }} aria-invalid={!!gradeError}>
              <option value="">Select a grade</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </Select>
          </AdminFormField>

          <AdminFormField id="pp-subject" label="Subject" required error={subjectError}>
            <Select id="pp-subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSubjectError(""); }} aria-invalid={!!subjectError}>
              <option value="">Select a subject</option>
              {subjectOptions.map((opt) => (<option key={opt.id} value={opt.id.toString()}>{opt.label}</option>))}
            </Select>
          </AdminFormField>

          <AdminFormField id="pp-year" label="Year" required error={yearError} hint="The year the paper was administered, e.g., 2024">
            <input id="pp-year" type="number" value={year} onChange={(e) => { setYear(e.target.value); setYearError(""); }} placeholder="e.g., 2024" min={2000} max={2099} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
          </AdminFormField>

          <AdminFormField id="pp-paper-content" label="Paper Content (Markdown)" hint="Write the past paper in Markdown format. Leave empty for exercise-only papers.">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowPreview(false)} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${!showPreview ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>Write</button>
                <button type="button" onClick={() => setShowPreview(true)} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${showPreview ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>Preview</button>
              </div>
              {showPreview ? (
                <div className="min-h-[200px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
                  {paperContent.trim() ? <MarkdownRenderer content={paperContent} className="text-sm" /> : <p className="text-sm text-[var(--text-secondary)] italic">Nothing to preview yet.</p>}
                </div>
              ) : (
                <textarea id="pp-paper-content" value={paperContent} onChange={(e) => { setPaperContent(e.target.value); setPaperContentError(""); }} placeholder="# Question 1&#10;&#10;Solve the following equation:&#10;&#10;$$x^2 + 5x + 6 = 0$$&#10;&#10;**[5 marks]**" rows={12} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
              )}
            </div>
          </AdminFormField>

          <AdminFormField id="pp-description" label="Description" hint="A short description shown to students on the paper card">
            <textarea id="pp-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Official BISE Quetta board exam paper" rows={2} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-y" />
          </AdminFormField>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <AdminFormField id="pp-duration" label="Duration (minutes)" hint="How long students have to complete the attempt">
              <input id="pp-duration" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="60" min={1} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
            </AdminFormField>
            <AdminFormField id="pp-marks" label="Total Marks" hint="Sum of all exercise marks in the paper">
              <input id="pp-marks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="0" min={0} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
            </AdminFormField>
          </div>

          <AdminFormField id="pp-published" label="Published" hint="Only published papers are visible to students">
            <div className="flex items-center gap-3">
              <Switch id="pp-published" checked={published} onCheckedChange={setPublished} />
              <label htmlFor="pp-published" className="text-sm text-[var(--text-primary)] cursor-pointer">{published ? "Published" : "Draft"}</label>
            </div>
          </AdminFormField>

          {/* Exercises section */}
          <div className="border-t border-[var(--border-default)] pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Exercises</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Link exercises so students can attempt this paper as a timed exam.</p>
              </div>
              <button type="button" onClick={() => { setShowExercisePicker(true); loadExercisesForPicker(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
                <Plus className="h-3.5 w-3.5" />Add Exercise
              </button>
            </div>

            {isLoadingExercises ? (
              <p className="text-xs text-[var(--text-secondary)]">Loading exercises...</p>
            ) : linkedExercises.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-center">
                <p className="text-xs text-[var(--text-secondary)]">No exercises linked yet. Add exercises to make this paper attemptable.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {linkedExercises.map((ex, idx) => (
                  <div key={ex.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2">
                    <GripVertical className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                    <span className="text-xs font-medium text-[var(--text-secondary)] w-6">{idx + 1}.</span>
                    <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{ex.question}</span>
                    <span className="text-xs text-[var(--text-secondary)] shrink-0">{ex.type?.replace(/_/g, " ")}</span>
                    <button type="button" onClick={() => handleRemoveExercise(ex.id)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {showExercisePicker && (
              <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input type="text" placeholder="Search exercises..." value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none" />
                  <button type="button" onClick={handleAddExercises} disabled={selectedExercises.size === 0} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">Add ({selectedExercises.size})</button>
                  <button type="button" onClick={() => { setShowExercisePicker(false); setSelectedExercises(new Set()); }} className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                </div>
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {filteredAvailableExercises.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] p-4 text-center">No exercises found. Create exercises first on the Exercises content tab.</p>
                  ) : (
                    filteredAvailableExercises.map((ex) => {
                      const isLinked = linkedExercises.some(l => l.id === ex.id);
                      const isSelected = selectedExercises.has(ex.id);
                      return (
                        <label key={ex.id} className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${isLinked ? "bg-[var(--bg-subtle)] opacity-50" : isSelected ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30" : "hover:bg-[var(--bg-subtle)]"}`}>
                          <input type="checkbox" checked={isSelected} disabled={isLinked} onChange={() => { setSelectedExercises(prev => { const next = new Set(prev); if (next.has(ex.id)) next.delete(ex.id); else next.add(ex.id); return next; }); }} className="accent-[var(--primary)]" />
                          <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{ex.question || ex.exerciseNumber}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{ex.type?.replace(/_/g, " ")}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <AdminFormField id="pp-solution-content" label="Solution Content (Markdown)" hint="Optional. Write the solutions/marking scheme in Markdown format">
            <textarea id="pp-solution-content" value={solutionContent} onChange={(e) => setSolutionContent(e.target.value)} placeholder="# Question 1 Solution&#10;&#10;Using the quadratic formula...&#10;&#10;$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$" rows={8} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
          </AdminFormField>

          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Past Paper"}
            </AdminActionButton>
            <Link href="/admin/content/past-papers">
              <AdminActionButton variant="secondary" type="button">Cancel</AdminActionButton>
            </Link>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}
