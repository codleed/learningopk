"use client";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { ChapterLinkGraph } from "../chapter-link-graph";
import type { SummaryEditorController } from "./use-summary-editor";

type SummaryGraphPanelProps = {
  editor: Pick<
    SummaryEditorController,
    | "isSummaryGraphLoading"
    | "filteredGraphNodes"
    | "filteredGraphEdges"
    | "summaryGraphSearch"
    | "setSummaryGraphSearch"
    | "loadSummaryGraph"
    | "summaryEditorChapterId"
    | "setSummaryEditorChapterId"
  >;
};

export function SummaryGraphPanel({ editor }: SummaryGraphPanelProps) {
  return (
    <div
      className="space-y-3 rounded-lg border border-border-default/60 bg-bg-base p-3"
      data-testid="curriculum-summary-graph-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
          Summary Graph
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={editor.loadSummaryGraph}
          disabled={editor.isSummaryGraphLoading}
        >
          {editor.isSummaryGraphLoading ? "Refreshing..." : "Refresh graph"}
        </Button>
      </div>
      <Input
        data-testid="curriculum-summary-graph-search"
        value={editor.summaryGraphSearch}
        onChange={(event) => editor.setSummaryGraphSearch(event.target.value)}
        placeholder="Filter graph by chapter title"
      />
      {editor.filteredGraphNodes.length > 0 ? (
        <ChapterLinkGraph
          nodes={editor.filteredGraphNodes}
          edges={editor.filteredGraphEdges}
          activeChapterId={
            editor.summaryEditorChapterId ? Number(editor.summaryEditorChapterId) : null
          }
          onOpenChapter={(chapterId) => {
            editor.setSummaryEditorChapterId(String(chapterId));
          }}
        />
      ) : (
        <p className="text-sm text-text-secondary">No graph nodes match the current filter.</p>
      )}
      <div className="max-h-32 overflow-auto rounded-md border border-border-default/50 bg-bg-base/60 p-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
          Open chapter
        </p>
        <div className="flex flex-wrap gap-1.5">
          {editor.filteredGraphNodes.slice(0, 20).map((node) => (
            <button
              key={node.id}
              type="button"
              data-testid={`curriculum-summary-graph-node-button-${node.id}`}
              className="rounded-md border border-border-default/70 px-2 py-1 text-xs text-text-primary transition hover:border-[var(--primary)]/60"
              onClick={() => editor.setSummaryEditorChapterId(String(node.id))}
            >
              {node.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
