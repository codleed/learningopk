"use client";

import { Button } from "../../ui/button";
import type { AdminChapterLinksResponse } from "@/lib/admin-api";
import type { SummaryEditorController } from "./use-summary-editor";

type SummaryLinksPanelProps = {
  editor: Pick<
    SummaryEditorController,
    | "isSummaryLinksLoading"
    | "summaryEditorOutgoingLinks"
    | "summaryEditorBacklinks"
    | "resolvedOutgoingLinks"
    | "unresolvedOutgoingLinks"
    | "refreshSummaryLinks"
  >;
};

type OutgoingLink = AdminChapterLinksResponse["links"]["outgoing"][number];
type Backlink = AdminChapterLinksResponse["links"]["backlinks"][number];

export function SummaryLinksPanel({ editor }: SummaryLinksPanelProps) {
  return (
    <div
      className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base p-3"
      data-testid="curriculum-summary-editor-links-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
          Links
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={editor.refreshSummaryLinks}
          disabled={editor.isSummaryLinksLoading}
        >
          {editor.isSummaryLinksLoading ? "Refreshing..." : "Refresh links"}
        </Button>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-text-primary">Outgoing</p>
        {editor.summaryEditorOutgoingLinks.length === 0 ? (
          <p className="text-text-secondary">No wiki links found in this summary.</p>
        ) : (
          <ul className="space-y-1 text-text-primary/90">
            {editor.resolvedOutgoingLinks.map((link: OutgoingLink) => (
              <li key={`${link.sourceChapterId}-${link.normalizedTarget}`}>
                - {link.targetChapterTitle ?? link.targetTitle}
              </li>
            ))}
            {editor.unresolvedOutgoingLinks.map((link: OutgoingLink) => (
              <li
                key={`${link.sourceChapterId}-${link.normalizedTarget}`}
                className="text-amber-700"
              >
                - {link.targetTitle} (unresolved)
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-text-primary">Backlinks</p>
        {editor.summaryEditorBacklinks.length === 0 ? (
          <p className="text-text-secondary">No other summaries currently link to this chapter.</p>
        ) : (
          <ul className="space-y-1 text-text-primary/90">
            {editor.summaryEditorBacklinks.map((link: Backlink) => (
              <li key={`${link.sourceChapterId}-${link.normalizedTarget}`}>
                - {link.sourceChapterTitle}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
