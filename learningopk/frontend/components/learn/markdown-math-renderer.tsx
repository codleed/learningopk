import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { CSSProperties } from "react";

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

const normalizeEscapedMathDelimiters = (content: string) =>
  content
    .replace(/\\\[((?:.|\r?\n)*?)\\\]/g, (_match, expression) => {
      const normalizedExpression = String(expression).trim();
      return normalizedExpression ? `$$\n${normalizedExpression}\n$$` : _match;
    })
    .replace(/\\\(((?:.|\r?\n)*?)\\\)/g, (_match, expression) => {
      const normalizedExpression = String(expression).trim();
      return normalizedExpression ? `$${normalizedExpression}$` : _match;
    });

const normalizeLegacyBracketedMath = (content: string) => {
  const wrapInlineMath = (expression: string) => {
    const normalizedExpression = expression.trim();
    return normalizedExpression ? `$${normalizedExpression}$` : expression;
  };

  const parenthesesNormalized = content.replace(/\(\s*([^()\r\n]*\\[A-Za-z]+[^()\r\n]*)\s*\)/g, (_match, expression) =>
    wrapInlineMath(String(expression))
  );

  return parenthesesNormalized.replace(/\[\s*([^[\]\r\n]*\\[A-Za-z]+[^[\]\r\n]*)\s*\]/g, (_match, expression) =>
    wrapInlineMath(String(expression))
  );
};

const DIMENSION_TOKEN_PATTERN = /\b(width|height)\s*=\s*([0-9]+(?:\.[0-9]+)?(?:px|%)?)\b/gi;

const parseImageDimensionsFromTitle = (title: string | null | undefined): CSSProperties => {
  if (!title) {
    return {};
  }

  const style: CSSProperties = {};
  let match = DIMENSION_TOKEN_PATTERN.exec(title);
  while (match) {
    const key = match[1]?.toLowerCase();
    const rawValue = match[2];
    if (key === "width" || key === "height") {
      const normalizedValue = /px$|%$/i.test(rawValue) ? rawValue : `${rawValue}px`;
      style[key] = normalizedValue;
    }
    match = DIMENSION_TOKEN_PATTERN.exec(title);
  }

  DIMENSION_TOKEN_PATTERN.lastIndex = 0;
  return style;
};

export function MarkdownMathRenderer({ content, className }: MarkdownMathRendererProps) {
  const normalizedContent = normalizeStandaloneBlockMath(
    normalizeLegacyBracketedMath(normalizeEscapedMathDelimiters(content))
  );

  return (
    <div
      className={[
        "prose prose-zinc max-w-none prose-headings:text-foreground prose-p:text-foreground/95 prose-li:text-foreground/95",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:text-foreground",
        className ?? ""
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          img: ({ title, style, ...props }) => (
            <img
              {...props}
              style={{
                ...parseImageDimensionsFromTitle(title),
                ...style
              }}
              loading="lazy"
            />
          )
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
