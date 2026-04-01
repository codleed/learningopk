"use client";

import { ContentRenderer } from "@/components/common/content-renderer";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <ContentRenderer
      content={content}
      variant="default"
      enableMath
      enableCode
      enableGfm
      className={className}
    />
  );
}
