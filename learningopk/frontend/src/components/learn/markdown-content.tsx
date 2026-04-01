import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return <MarkdownRenderer content={content} />;
}
