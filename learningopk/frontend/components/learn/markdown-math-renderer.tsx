import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type MarkdownMathRendererProps = {
  content: string;
  className?: string;
};

const normalizeStandaloneBlockMath = (content: string) =>
  content.replace(/(^|\r?\n)[ \t]*\$\$([^\r\n]+?)\$\$[ \t]*(?=\r?\n|$)/g, (match, lineStart, expression) => {
    const normalizedExpression = String(expression).trim();
    if (!normalizedExpression) {
      return match;
    }
    return `${lineStart}$$\n${normalizedExpression}\n$$`;
  });

export function MarkdownMathRenderer({ content, className }: MarkdownMathRendererProps) {
  const normalizedContent = normalizeStandaloneBlockMath(content);

  return (
    <div
      className={[
        "prose prose-zinc max-w-none prose-headings:text-foreground prose-p:text-foreground/95 prose-li:text-foreground/95",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:text-foreground",
        className ?? ""
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
