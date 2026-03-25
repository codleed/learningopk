"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { latexToSpokenForm, isComplexEquation, generateEquationDescription } from "@/lib/latex-to-speech";

type MarkdownMathRendererProps = {
  content: string;
  className?: string;
  forceWrap?: boolean;
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

const stripNestedInlineMathDelimiters = (expression: string): string =>
  expression.replace(/(?<!\\)\$([^\r\n$]+?)\$/g, (_match, nestedExpression) => String(nestedExpression).trim());

const normalizeNestedMathDelimiters = (content: string): string => {
  const normalizedBlocks = content.replace(/\$\$([\s\S]*?)\$\$/g, (_match, expression) => {
    const normalizedExpression = stripNestedInlineMathDelimiters(String(expression));
    return `$$${normalizedExpression}$$`;
  });

  return normalizedBlocks.replace(/(?<!\\)(?<!\$)\$([^\r\n$]+?)\$(?!\$)/g, (_match, expression) => {
    const normalizedExpression = stripNestedInlineMathDelimiters(String(expression));
    return `$${normalizedExpression}$`;
  });
};

const normalizeBareLatexLines = (content: string): string =>
  content.replace(/(^|\r?\n)([ \t]*\\[A-Za-z]+[^\r\n]*)(?=\r?\n|$)/g, (match, lineStart, expression) => {
    const normalizedExpression = String(expression).trim();
    if (!normalizedExpression || normalizedExpression.startsWith("\\[") || normalizedExpression.startsWith("\\(")) {
      return match;
    }

    if (/^\$/.test(normalizedExpression) || /^\$\$/.test(normalizedExpression)) {
      return `${lineStart}${normalizedExpression}`;
    }

    return `${lineStart}$${stripNestedInlineMathDelimiters(normalizedExpression)}$`;
  });

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

export function MarkdownMathRenderer({ content, className, forceWrap = false }: MarkdownMathRendererProps) {
  const normalizedContent = normalizeStandaloneBlockMath(
    normalizeNestedMathDelimiters(
      normalizeBareLatexLines(normalizeLegacyBracketedMath(normalizeEscapedMathDelimiters(content)))
    )
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const katexElements = container.querySelectorAll(".katex");
    katexElements.forEach((el) => {
      const latex = el.getAttribute("data-tex") || "";
      const spokenForm = latexToSpokenForm(latex);
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", spokenForm);

      if (isComplexEquation(latex)) {
        const description = generateEquationDescription(latex);
        el.setAttribute("aria-description", description);
      }
    });
  }, [normalizedContent]);

  return (
    <div
      ref={containerRef}
      className={[
        "max-w-none text-foreground/95",
        forceWrap ? "break-words [overflow-wrap:anywhere] [&_*]:break-words [&_*]:[overflow-wrap:anywhere]" : "",
        className ?? ""
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 {...props} className="mt-5 mb-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props} className="mt-4 mb-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="mt-3 mb-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl">
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 {...props} className="mt-3 mb-2 text-lg font-semibold leading-tight text-foreground">
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 {...props} className="mt-3 mb-2 text-base font-semibold leading-tight text-foreground">
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 {...props} className="mt-3 mb-2 text-sm font-semibold leading-tight uppercase tracking-wide text-foreground">
              {children}
            </h6>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className={forceWrap ? "my-3 break-words leading-7 text-foreground/95 [overflow-wrap:anywhere]" : "my-3 leading-7 text-foreground/95"}>
              {children}
            </p>
          ),
          hr: (props) => <hr {...props} className="my-6 border-border/80" />,
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic text-foreground/95">
              {children}
            </em>
          ),
          del: ({ children, ...props }) => (
            <del {...props} className="text-muted-foreground">
              {children}
            </del>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="my-4 border-l-4 border-[var(--primary)]/45 bg-muted/35 px-4 py-2 italic text-foreground/90"
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, className, ...props }) => {
            const isTaskList = (className ?? "").includes("contains-task-list");
            return (
              <ul
                {...props}
                className={
                  isTaskList
                    ? "my-3 space-y-2 list-none pl-0 text-foreground/95"
                    : "my-3 ml-6 list-disc space-y-1 text-foreground/95"
                }
              >
                {children}
              </ul>
            );
          },
          ol: ({ children, ...props }) => (
            <ol {...props} className="my-3 ml-6 list-decimal space-y-1 text-foreground/95">
              {children}
            </ol>
          ),
          li: ({ children, className, ...props }) => {
            const isTaskItem = (className ?? "").includes("task-list-item");
            return (
              <li {...props} className={isTaskItem ? "flex items-start gap-2 leading-7" : "pl-1 leading-7"}>
                {children}
              </li>
            );
          },
          a: ({ children, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--primary)] underline decoration-[var(--primary)]/50 underline-offset-2 hover:decoration-[var(--primary)]"
            >
              {children}
            </a>
          ),
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className={
                forceWrap
                  ? "my-4 overflow-x-hidden whitespace-pre-wrap break-words rounded-lg border border-border/70 bg-muted/55 p-3 text-sm text-foreground"
                  : "my-4 overflow-x-auto rounded-lg border border-border/70 bg-muted/55 p-3 text-sm text-foreground"
              }
            >
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <code {...props} className={[className ?? "", "font-mono text-sm text-foreground"].join(" ").trim()}>
                  {children}
                </code>
              );
            }
            return (
              <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em] text-foreground">
                {children}
              </code>
            );
          },
          input: ({ type, checked, ...props }) => {
            if (type === "checkbox") {
              return (
                <input
                  {...props}
                  checked={Boolean(checked)}
                  disabled
                  readOnly
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
              );
            }
            return <input {...props} type={type} />;
          },
          sup: ({ children, ...props }) => (
            <sup {...props} className="text-xs align-super">
              {children}
            </sup>
          ),
          section: ({ children, className, ...props }) => {
            const isFootnotesSection = Boolean((props as Record<string, unknown>)["data-footnotes"]);
            const sectionClassName = isFootnotesSection
              ? "mt-8 border-t border-border/70 pt-4 text-sm text-muted-foreground"
              : className ?? "";
            return (
              <section {...props} className={sectionClassName}>
                {children}
              </section>
            );
          },
          img: ({ title, style, alt, ...props }) => (
            <img
              {...props}
              alt={alt ?? ""}
              className="my-4 h-auto max-w-full rounded-md border border-border/70"
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
