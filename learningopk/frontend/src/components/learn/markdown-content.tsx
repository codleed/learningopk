import { MarkdownMathRenderer } from "./markdown-math-renderer";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return <MarkdownMathRenderer content={content} />;
}
