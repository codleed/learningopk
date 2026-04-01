"use client";

import { useMemo } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { parseMarkdownBlocks } from "@/hooks/usePretextMeasure";
import type { Components } from "react-markdown";

const DEFAULT_THRESHOLD = 5000;

interface VirtualizedMarkdownProps {
  content: string;
  threshold?: number;
  components?: Partial<Components>;
  className?: string;
}

function hasTables(content: string): boolean {
  const lines = content.split("\n");
  let tableRowCount = 0;
  for (const line of lines) {
    if (line.match(/^\|.*\|$/)) {
      tableRowCount++;
      if (tableRowCount >= 2) return true;
    } else {
      tableRowCount = 0;
    }
  }
  return false;
}

export function VirtualizedMarkdown({
  content,
  threshold = DEFAULT_THRESHOLD,
  components,
  className,
}: VirtualizedMarkdownProps) {
  const shouldVirtualize = content.length >= threshold;
  const hasTableContent = useMemo(() => hasTables(content), [content]);

  const blocks = useMemo(() => {
    if (!shouldVirtualize) return [];
    return parseMarkdownBlocks(content);
  }, [content, shouldVirtualize]);

  const useBlockSplitting = shouldVirtualize && blocks.length > 20 && !hasTableContent;

  if (!useBlockSplitting) {
    return (
      <div className={`md-root ${className ?? ""}`}>
        <MarkdownRenderer content={content} components={components} />
      </div>
    );
  }

  return (
    <div className={`md-root ${className ?? ""}`}>
      {blocks.map((block) => (
        <MarkdownRenderer key={block.id} content={block.raw} components={components} />
      ))}
    </div>
  );
}
