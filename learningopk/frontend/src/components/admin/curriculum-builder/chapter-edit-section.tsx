"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChapterOption, SectionCommonProps } from "./types";
import { CodeMirrorMarkdownEditor } from "../codemirror-markdown-editor";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MarkdownRenderer } from "../../MarkdownRenderer";
import { Select } from "../../ui/select";
import { SummaryGraphPanel } from "./summary-graph-panel";
import { SummaryLinksPanel } from "./summary-links-panel";
import { useSummaryEditor } from "./use-summary-editor";

type ChapterEditSectionProps = SectionCommonProps & {
  chapterOptions: ChapterOption[];
};

export function ChapterEditSection({
  chapterOptions,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: ChapterEditSectionProps) {
  const [isSummaryEditorPreviewVisible, setIsSummaryEditorPreviewVisible] = useState(false);
  const editor = useSummaryEditor({ chapterOptions, setIsSubmitting, refreshTree });

  const wikiLinkTargets = useMemo(
    () =>
      Array.from(
        chapterOptions.reduce((targets, chapter) => {
          targets.add(chapter.title);
          return targets;
        }, new Set<string>())
      ).sort((left, right) => left.localeCompare(right)),
    [chapterOptions]
  );

  useEffect(() => {
    void editor.loadSummaryGraph();
  }, [editor.loadSummaryGraph, chapterOptions.length]);

  return (
    <div className="space-y-3 rounded-lg border border-border-default/60 bg-bg-base/50 p-3">
      <p className="text-sm font-semibold text-text-primary">Edit Existing Chapter Summary</p>
      <Select
        data-testid="curriculum-summary-editor-chapter-select"
        value={editor.summaryEditorChapterId}
        onChange={(event) => editor.setSummaryEditorChapterId(event.target.value)}
      >
        <option value="">Select chapter</option>
        {chapterOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>

      <div
        className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3"
        data-testid="curriculum-chapter-manage"
      >
        <p className="text-sm font-semibold text-text-primary">Update / Delete Chapter</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            data-testid="curriculum-chapter-manage-number-input"
            type="number"
            min={1}
            value={editor.manageChapterNumber}
            onChange={(event) => editor.setManageChapterNumber(event.target.value)}
            placeholder="Chapter number"
            disabled={!editor.summaryEditorChapterId}
          />
          <Input
            data-testid="curriculum-chapter-manage-title-input"
            value={editor.manageChapterTitle}
            onChange={(event) => editor.setManageChapterTitle(event.target.value)}
            placeholder="Chapter title"
            disabled={!editor.summaryEditorChapterId}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="curriculum-chapter-manage-update"
            type="button"
            size="sm"
            variant="secondary"
            disabled={!editor.summaryEditorChapterId || isSubmitting}
            onClick={editor.updateChapterMeta}
          >
            Update chapter
          </Button>
          <Button
            data-testid="curriculum-chapter-manage-delete"
            type="button"
            size="sm"
            variant="secondary"
            disabled={!editor.summaryEditorChapterId || isSubmitting}
            onClick={editor.deleteChapter}
          >
            Delete chapter
          </Button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3">
        <p className="text-sm font-semibold text-text-primary">Summary input options</p>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="curriculum-summary-editor-paste-option"
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => editor.summaryEditorCodeMirrorRef.current?.focus()}
            disabled={!editor.summaryEditorChapterId || editor.isSummaryLoading}
          >
            Paste markdown
          </Button>
          <Button
            data-testid="curriculum-summary-editor-markdown-option"
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => editor.summaryEditorMarkdownInputRef.current?.click()}
            disabled={
              !editor.summaryEditorChapterId || editor.isSummaryLoading || editor.isSummarySaving
            }
          >
            Upload .md file
          </Button>
        </div>
        <Input
          ref={editor.summaryEditorMarkdownInputRef}
          data-testid="curriculum-summary-editor-markdown-input"
          type="file"
          accept=".md,text/markdown,text/plain"
          onChange={editor.importSummaryMarkdown}
          disabled={
            !editor.summaryEditorChapterId || editor.isSummaryLoading || editor.isSummarySaving
          }
        />
        <p className="text-xs text-text-secondary">
          Uploading a Markdown file loads it into the editor for review. Use Save summary to persist
          it.
        </p>
      </div>

      <CodeMirrorMarkdownEditor
        ref={editor.summaryEditorCodeMirrorRef}
        value={editor.summaryEditorContent}
        onChange={editor.handleSummaryEditorContentChange}
        placeholderText="Summary markdown for the selected chapter."
        disabled={
          !editor.summaryEditorChapterId ||
          editor.isSummaryLoading ||
          editor.isSummaryMediaUploading
        }
        testId="curriculum-summary-editor-cm6"
        wikiLinkTargets={wikiLinkTargets}
        onWikiLinkQueryChange={editor.handleWikiLinkQueryChange}
      />

      {editor.wikiLinkSuggestions.length > 0 && editor.summaryEditorChapterId ? (
        <div
          data-testid="curriculum-summary-editor-link-suggestions"
          className="space-y-1 rounded-lg border border-border-default/60 bg-bg-base p-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Wiki link suggestions for [[{editor.wikiLinkSuggestionQuery || "..."}]]
          </p>
          <div className="flex flex-wrap gap-1.5">
            {editor.wikiLinkSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-md border border-border-default/70 bg-bg-base px-2 py-1 text-xs text-text-primary transition hover:border-[var(--primary)]/60"
                onClick={() => editor.applyWikiLinkSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-2">
        <Input
          data-testid="curriculum-summary-editor-alt-input"
          value={editor.summaryEditorImageAlt}
          onChange={(event) => editor.setSummaryEditorImageAlt(event.target.value)}
          placeholder="Image alt text"
          disabled={!editor.summaryEditorChapterId}
        />
        <Input
          ref={editor.summaryEditorUploadInputRef}
          data-testid="curriculum-summary-editor-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={!editor.summaryEditorChapterId || editor.isSummaryMediaUploading}
        />
        <Input
          data-testid="curriculum-summary-editor-width-input"
          type="number"
          min={1}
          value={editor.summaryEditorImageWidth}
          onChange={(event) => editor.setSummaryEditorImageWidth(event.target.value)}
          placeholder="Width (px)"
          disabled={!editor.summaryEditorChapterId}
        />
        <Input
          data-testid="curriculum-summary-editor-height-input"
          type="number"
          min={1}
          value={editor.summaryEditorImageHeight}
          onChange={(event) => editor.setSummaryEditorImageHeight(event.target.value)}
          placeholder="Height (px, optional)"
          disabled={!editor.summaryEditorChapterId}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="curriculum-summary-editor-upload-button"
          type="button"
          size="sm"
          variant="secondary"
          onClick={editor.uploadSummaryFigure}
          disabled={!editor.summaryEditorChapterId || editor.isSummaryMediaUploading}
        >
          {editor.isSummaryMediaUploading ? "Uploading..." : "Upload figure"}
        </Button>
        <Button
          data-testid="curriculum-summary-editor-save-button"
          type="button"
          size="sm"
          variant="secondary"
          onClick={editor.saveSummaryEditor}
          disabled={
            !editor.summaryEditorChapterId || editor.isSummarySaving || editor.isSummaryLoading
          }
        >
          {editor.isSummarySaving ? "Saving..." : "Save summary"}
        </Button>
        <Button
          data-testid="curriculum-summary-editor-preview-toggle"
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsSummaryEditorPreviewVisible((current) => !current)}
        >
          {isSummaryEditorPreviewVisible ? "Hide preview" : "Show preview"}
        </Button>
      </div>

      <p className="text-xs text-text-secondary">
        Uploaded image markdown is inserted at cursor position. Width/height are emitted as image
        title metadata (`&quot;width=640 height=320&quot;`).
      </p>

      <SummaryLinksPanel editor={editor} />
      <SummaryGraphPanel editor={editor} />

      {isSummaryEditorPreviewVisible ? (
        <div
          className="rounded-lg border border-border-default/60 bg-bg-base p-3"
          data-testid="curriculum-summary-editor-preview"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Editor preview
          </p>
          {editor.summaryEditorContent.trim().length > 0 ? (
            <MarkdownRenderer content={editor.summaryEditorContent} className="prose-sm" />
          ) : (
            <p className="text-sm text-text-secondary">
              Select a chapter to load and preview summary markdown.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
