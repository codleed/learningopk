"use client";

import { ContentRenderer } from "@/components/common/content-renderer";

type MarkdownMathRendererProps = {
  content: string;
  className?: string;
  forceWrap?: boolean;
};

export function MarkdownMathRenderer({
  content,
  className,
}: MarkdownMathRendererProps) {
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
