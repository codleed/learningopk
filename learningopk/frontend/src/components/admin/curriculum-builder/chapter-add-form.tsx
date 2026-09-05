"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { createAdminCurriculumChapter } from "@/lib/admin-api";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MarkdownRenderer } from "../../MarkdownRenderer";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useToast } from "../../ui/toast";
import type { SectionCommonProps, SubjectOption } from "./types";
import { toSlug } from "./utils";

type ChapterAddFormProps = SectionCommonProps & {
  subjectOptions: SubjectOption[];
};

export function ChapterAddForm({
  subjectOptions,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: ChapterAddFormProps) {
  const { pushToast } = useToast();
  const [chapterSubjectId, setChapterSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("1");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [isChapterSummaryPreviewVisible, setIsChapterSummaryPreviewVisible] = useState(false);
  const chapterMarkdownInputRef = useRef<HTMLInputElement | null>(null);

  const submitChapter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = Number(chapterSubjectId);
    const chapterNumberValue = Number(chapterNumber);
    const title = chapterTitle.trim();
    const summary = chapterSummary.trim();
    if (!subjectId || !chapterNumberValue || !title || !summary) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumChapter({
        subjectId,
        chapterNumber: chapterNumberValue,
        title,
        slug: toSlug(title),
      });
      setChapterNumber("1");
      setChapterTitle("");
      setChapterSummary("");
      if (chapterMarkdownInputRef.current) {
        chapterMarkdownInputRef.current.value = "";
      }
      await refreshTree();
      pushToast({ title: "Chapter created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create chapter", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const importChapterMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedMarkdown = await file.text();
      if (importedMarkdown.trim().length === 0) {
        pushToast({
          title: "Markdown file is empty",
          tone: "error",
        });
        return;
      }

      if (
        chapterSummary.trim().length > 0 &&
        !window.confirm(
          "Importing a Markdown file will replace the current chapter summary draft. Continue?"
        )
      ) {
        return;
      }

      setChapterSummary(importedMarkdown);
      pushToast({
        title: "Markdown imported into chapter form",
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Could not read Markdown file",
        tone: "error",
      });
    } finally {
      input.value = "";
    }
  };

  return (
    <form className="space-y-2" data-testid="curriculum-chapter-form" onSubmit={submitChapter}>
      <p className="text-sm font-semibold text-text-primary">Add Chapter</p>
      <Select
        data-testid="curriculum-chapter-subject-select"
        value={chapterSubjectId}
        onChange={(event) => setChapterSubjectId(event.target.value)}
      >
        <option value="">Select subject</option>
        {subjectOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
      <Input
        data-testid="curriculum-chapter-number-input"
        type="number"
        min={1}
        value={chapterNumber}
        onChange={(event) => setChapterNumber(event.target.value)}
        placeholder="Chapter number"
      />
      <Input
        data-testid="curriculum-chapter-title-input"
        value={chapterTitle}
        onChange={(event) => setChapterTitle(event.target.value)}
        placeholder="Chapter title"
      />
      <Textarea
        data-testid="curriculum-chapter-summary-input"
        value={chapterSummary}
        onChange={(event) => setChapterSummary(event.target.value)}
        className="min-h-48 resize-y"
        placeholder="Write chapter summary in Markdown. Example: ![Diagram](https://...) and $$E=mc^2$$"
      />
      <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3">
        <p className="text-sm font-semibold text-text-primary">Summary import</p>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="curriculum-chapter-markdown-option"
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => chapterMarkdownInputRef.current?.click()}
            disabled={isSubmitting}
          >
            Upload .md file
          </Button>
        </div>
        <Input
          ref={chapterMarkdownInputRef}
          data-testid="curriculum-chapter-markdown-input"
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={importChapterMarkdown}
          disabled={isSubmitting}
        />
        <p className="text-xs text-text-secondary">
          Uploading a Markdown file loads it into the chapter summary field for review before you
          add the chapter.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">Supports Markdown, images, and math notation.</p>
        <Button
          data-testid="curriculum-chapter-summary-preview-toggle"
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsChapterSummaryPreviewVisible((current) => !current)}
        >
          {isChapterSummaryPreviewVisible ? "Hide preview" : "Show preview"}
        </Button>
      </div>
      {isChapterSummaryPreviewVisible ? (
        <div
          className="rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
          data-testid="curriculum-chapter-summary-preview"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Summary preview
          </p>
          {chapterSummary.trim().length > 0 ? (
            <MarkdownRenderer content={chapterSummary} className="prose-sm" />
          ) : (
            <p className="text-sm text-text-secondary">
              Preview appears here as rendered Markdown.
            </p>
          )}
        </div>
      ) : null}
      <Button
        data-testid="curriculum-chapter-submit"
        type="submit"
        size="sm"
        variant="secondary"
        disabled={isSubmitting}
      >
        Add chapter
      </Button>
    </form>
  );
}
