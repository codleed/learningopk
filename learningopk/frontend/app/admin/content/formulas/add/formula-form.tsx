"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import {
  AdminBreadcrumb,
  AdminPageHeader,
  AdminFormCard,
  AdminFormField,
  AdminActionButton,
} from "@/components/admin";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Select } from "@/components/ui/select";
import {
  createAdminFormula,
  updateAdminFormula,
  type AdminCurriculumBoard,
  type FormulaResponse,
} from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

interface FormulaFormProps {
  boards: AdminCurriculumBoard[];
  existingFormula?: FormulaResponse;
}

interface VariableRow {
  id: string;
  symbol: string;
  meaning: string;
}

export function FormulaForm({ boards, existingFormula }: FormulaFormProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const isEdit = !!existingFormula;

  // Build subject options from boards tree
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

  // Build chapter options filtered by selected subject
  const getChapterOptions = (selectedSubjectId: number) => {
    const options: Array<{ id: number; label: string }> = [];
    for (const board of boards) {
      for (const boardClass of board.classes) {
        for (const subject of boardClass.subjects) {
          if (subject.id === selectedSubjectId) {
            for (const chapter of subject.chapters) {
              options.push({
                id: chapter.id,
                label: `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
              });
            }
          }
        }
      }
    }
    return options;
  };

  // Form state
  const [subjectId, setSubjectId] = useState<string>(existingFormula?.subjectId?.toString() ?? "");
  const [chapterId, setChapterId] = useState<string>(existingFormula?.chapterId?.toString() ?? "");
  const [name, setName] = useState(existingFormula?.name ?? "");
  const [formulaLatex, setFormulaLatex] = useState(existingFormula?.formulaLatex ?? "");
  const [description, setDescription] = useState(existingFormula?.description ?? "");
  const [variables, setVariables] = useState<VariableRow[]>(
    existingFormula?.variables?.length
      ? existingFormula.variables.map((v, i) => ({
          id: String(i),
          symbol: v.symbol,
          meaning: v.meaning,
        }))
      : []
  );
  const [tagsInput, setTagsInput] = useState(existingFormula?.tags?.join(", ") ?? "");

  // Errors
  const [subjectError, setSubjectError] = useState("");
  const [chapterError, setChapterError] = useState("");
  const [nameError, setNameError] = useState("");
  const [latexError, setLatexError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const chapterOptions = subjectId ? getChapterOptions(parseInt(subjectId, 10)) : [];

  const addVariable = () => {
    setVariables([...variables, { id: Date.now().toString(), symbol: "", meaning: "" }]);
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (id: string, field: "symbol" | "meaning", value: string) => {
    setVariables(variables.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const validateForm = (): boolean => {
    let hasError = false;

    if (!subjectId) {
      setSubjectError("Subject is required");
      hasError = true;
    } else {
      setSubjectError("");
    }

    if (!chapterId) {
      setChapterError("Chapter is required");
      hasError = true;
    } else {
      setChapterError("");
    }

    if (!name.trim()) {
      setNameError("Name is required");
      hasError = true;
    } else {
      setNameError("");
    }

    if (!formulaLatex.trim()) {
      setLatexError("LaTeX formula is required");
      hasError = true;
    } else {
      setLatexError("");
    }

    if (!description.trim()) {
      setDescriptionError("Description is required");
      hasError = true;
    } else {
      setDescriptionError("");
    }

    return !hasError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const validVariables = variables
      .filter((v) => v.symbol.trim() && v.meaning.trim())
      .map((v) => ({ symbol: v.symbol.trim(), meaning: v.meaning.trim() }));

    try {
      if (isEdit && existingFormula) {
        await updateAdminFormula({
          id: existingFormula.id,
          input: {
            subjectId: parseInt(subjectId, 10),
            chapterId: parseInt(chapterId, 10),
            name: name.trim(),
            formulaLatex: formulaLatex.trim(),
            description: description.trim(),
            variables: validVariables,
            tags: parsedTags,
          },
        });
        pushToast({
          title: "Formula updated",
          description: `"${name.trim()}" has been updated successfully.`,
          tone: "success",
        });
      } else {
        await createAdminFormula({
          subjectId: parseInt(subjectId, 10),
          chapterId: parseInt(chapterId, 10),
          name: name.trim(),
          formulaLatex: formulaLatex.trim(),
          description: description.trim(),
          variables: validVariables,
          tags: parsedTags,
        });
        pushToast({
          title: "Formula created",
          description: `"${name.trim()}" has been created successfully.`,
          tone: "success",
        });
      }
      router.push("/admin/content/formulas");
    } catch (error) {
      pushToast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${isEdit ? "update" : "create"} formula`,
        tone: "error",
      });
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
            { label: "Formulas", href: "/admin/content/formulas" },
            {
              label: isEdit ? `Edit "${existingFormula?.name}"` : "Add Formula",
            },
          ]}
        />
      </StickyBreadcrumbWrapper>

      <AdminPageHeader
        title={isEdit ? "Edit Formula" : "Add Formula"}
        subtitle={
          isEdit
            ? "Update the formula details below"
            : "Create a new formula in the formula library"
        }
      />

      <AdminFormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <AdminFormField id="formula-subject" label="Subject" required error={subjectError}>
            <Select
              id="formula-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId("");
                setSubjectError("");
              }}
              aria-invalid={!!subjectError}
            >
              <option value="">Select a subject</option>
              {subjectOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          {/* Chapter */}
          <AdminFormField id="formula-chapter" label="Chapter" required error={chapterError}>
            <Select
              id="formula-chapter"
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setChapterError("");
              }}
              aria-invalid={!!chapterError}
              disabled={!subjectId}
            >
              <option value="">{subjectId ? "Select a chapter" : "Select a subject first"}</option>
              {chapterOptions.map((opt) => (
                <option key={opt.id} value={opt.id.toString()}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </AdminFormField>

          {/* Name */}
          <AdminFormField
            id="formula-name"
            label="Formula Name"
            required
            error={nameError}
            hint='e.g., "Pythagorean Theorem", "Quadratic Formula"'
          >
            <input
              id="formula-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              placeholder="e.g., Pythagorean Theorem"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* LaTeX Formula */}
          <AdminFormField
            id="formula-latex"
            label="LaTeX Formula"
            required
            error={latexError}
            hint="Enter the formula in LaTeX notation, e.g., a^2 + b^2 = c^2"
          >
            <textarea
              id="formula-latex"
              value={formulaLatex}
              onChange={(e) => {
                setFormulaLatex(e.target.value);
                setLatexError("");
              }}
              placeholder="e.g., a^2 + b^2 = c^2"
              rows={3}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* LaTeX Preview */}
          {formulaLatex.trim() && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Preview
              </p>
              <div className="overflow-x-auto text-center text-lg text-[var(--text-primary)]">
                <code className="font-mono">{formulaLatex}</code>
              </div>
            </div>
          )}

          {/* Description */}
          <AdminFormField
            id="formula-description"
            label="Description"
            required
            error={descriptionError}
            hint="A brief explanation of when and how this formula is used"
          >
            <textarea
              id="formula-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError("");
              }}
              placeholder="Describe the formula and its usage..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Variables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--text-primary)]">Variables</label>
              <button
                type="button"
                onClick={addVariable}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add Variable
              </button>
            </div>

            {variables.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
                No variables added yet. Click &quot;Add Variable&quot; to define formula variables.
              </p>
            )}

            {variables.map((variable, index) => (
              <div
                key={variable.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3"
              >
                <div className="flex-1">
                  <label
                    htmlFor={`var-symbol-${variable.id}`}
                    className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Symbol
                  </label>
                  <input
                    id={`var-symbol-${variable.id}`}
                    type="text"
                    value={variable.symbol}
                    onChange={(e) => updateVariable(variable.id, "symbol", e.target.value)}
                    placeholder="e.g., a"
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div className="flex-[2]">
                  <label
                    htmlFor={`var-meaning-${variable.id}`}
                    className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Meaning
                  </label>
                  <input
                    id={`var-meaning-${variable.id}`}
                    type="text"
                    value={variable.meaning}
                    onChange={(e) => updateVariable(variable.id, "meaning", e.target.value)}
                    placeholder="e.g., length of side a"
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariable(variable.id)}
                  className="mt-5 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  aria-label={`Remove variable ${index + 1}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>

          {/* Tags */}
          <AdminFormField
            id="formula-tags"
            label="Tags"
            hint="Comma-separated tags, e.g., geometry, triangles, basic"
          >
            <input
              id="formula-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., geometry, triangles, basic"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </AdminFormField>

          {/* Tag Preview */}
          {tagsInput.trim() && (
            <div className="flex flex-wrap gap-1.5">
              {tagsInput
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <AdminActionButton
              variant="primary"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isEdit ? "Save Changes" : "Create Formula"}
            </AdminActionButton>
            <Link href="/admin/content/formulas">
              <AdminActionButton variant="secondary" type="button">
                Cancel
              </AdminActionButton>
            </Link>
          </div>
        </form>
      </AdminFormCard>
    </div>
  );
}
