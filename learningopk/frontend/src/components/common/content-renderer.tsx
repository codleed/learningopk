"use client";

import { useCallback, useMemo, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

import { markdownSanitizeSchema } from "@/lib/markdown-sanitize-schema";
import { cva } from "class-variance-authority";
import { Check, Copy, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for the markdown + math content rendering pipeline. */
export interface ContentRendererProps {
  /** Raw markdown string to render. */
  content: string;
  /** Rendering variant controlling spacing density. */
  variant?: "default" | "compact" | "ai-message";
  /** Enable LaTeX math rendering with KaTeX (inline $ and block $$). */
  enableMath?: boolean;
  /** Enable syntax-highlighted code blocks. */
  enableCode?: boolean;
  /** Enable GitHub Flavored Markdown (tables, strikethrough, task lists). */
  enableGfm?: boolean;
  /** Additional CSS class names for the root wrapper. */
  className?: string;
}

/* ─── CVA variant styles ─── */
const contentVariants = cva("md-root leading-relaxed", {
  variants: {
    variant: {
      default: "text-base [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      compact:
        "text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5",
      "ai-message": "text-[0.9375rem] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/* ─── Code-block copy button (used inside fenced code blocks) ─── */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md px-2 py-1",
        "text-xs font-medium transition",
        "text-white/60 hover:text-white hover:bg-white/10",
        "opacity-0 group-hover:opacity-100 focus:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
      )}
      aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

/**
 * Full markdown + math rendering pipeline.
 *
 * Supports KaTeX math (inline/block), GFM tables, task lists, code fences
 * with syntax highlighting, and responsive styling via CSS variable tokens.
 */
export function ContentRenderer({
  content,
  variant = "default",
  enableMath = true,
  enableCode = true,
  enableGfm = true,
  className,
}: ContentRendererProps) {
  /* ─── Build plugin arrays dynamically ─── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type UnifiedPlugin = NonNullable<Parameters<typeof ReactMarkdown>[0]["remarkPlugins"]>[number];

  const remarkPlugins = useMemo(() => {
    const plugins: UnifiedPlugin[] = [remarkBreaks as UnifiedPlugin];
    if (enableMath) plugins.push(remarkMath as UnifiedPlugin);
    if (enableGfm) plugins.push(remarkGfm as UnifiedPlugin);
    return plugins;
  }, [enableMath, enableGfm]);

  const rehypePlugins = useMemo(() => {
    // rehype-sanitize MUST run immediately after rehype-raw so that any raw
    // HTML (including from user-submitted forum/notes/AI content) has scripts,
    // event handlers, and javascript: URLs stripped before rendering.
    const plugins: UnifiedPlugin[] = [
      rehypeRaw as UnifiedPlugin,
      [rehypeSanitize, markdownSanitizeSchema] as unknown as UnifiedPlugin,
    ];
    if (enableMath) plugins.push(rehypeKatex as UnifiedPlugin);
    if (enableCode) plugins.push(rehypeHighlight as UnifiedPlugin);
    return plugins;
  }, [enableMath, enableCode]);

  /* ─── Custom component overrides ─── */
  const components = useMemo<Components>(
    () => ({
      /* ── Headings (Syne / font-display) ── */
      h1: ({ children, ...props }) => (
        <h1
          className="md-h1 font-display text-3xl font-bold tracking-tight text-text-primary mt-8 mb-4 first:mt-0"
          {...props}
        >
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2
          className="md-h2 font-display text-2xl font-bold tracking-tight text-text-primary mt-7 mb-3 first:mt-0"
          {...props}
        >
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3
          className="md-h3 font-display text-xl font-semibold tracking-tight text-text-primary mt-6 mb-2 first:mt-0"
          {...props}
        >
          {children}
        </h3>
      ),
      h4: ({ children, ...props }) => (
        <h4
          className="md-h4 font-display text-lg font-semibold text-text-primary mt-5 mb-2 first:mt-0"
          {...props}
        >
          {children}
        </h4>
      ),
      h5: ({ children, ...props }) => (
        <h5
          className="md-h5 font-display text-base font-semibold text-text-primary mt-4 mb-1 first:mt-0"
          {...props}
        >
          {children}
        </h5>
      ),
      h6: ({ children, ...props }) => (
        <h6
          className="md-h6 font-display text-sm font-semibold uppercase tracking-wider text-text-secondary mt-4 mb-1 first:mt-0"
          {...props}
        >
          {children}
        </h6>
      ),

      /* ── Paragraph ── */
      p: ({ children, ...props }) => (
        <p className="md-p my-3 text-text-primary leading-relaxed" {...props}>
          {children}
        </p>
      ),

      /* ── Links ── */
      a: ({ href, children, ...props }) => {
        const isExternal = href?.startsWith("http://") || href?.startsWith("https://");

        return (
          <a
            href={href}
            className="md-a inline-flex items-center gap-0.5 text-accent-primary underline underline-offset-2 decoration-accent-primary/40 hover:decoration-accent-primary transition-colors"
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            {...props}
          >
            {children}
            {isExternal ? <ExternalLink className="inline h-3 w-3 shrink-0" /> : null}
          </a>
        );
      },

      /* ── Strong / Emphasis / Strikethrough ── */
      strong: ({ children, ...props }) => (
        <strong className="md-strong font-semibold text-text-primary" {...props}>
          {children}
        </strong>
      ),
      em: ({ children, ...props }) => (
        <em className="md-em italic" {...props}>
          {children}
        </em>
      ),
      del: ({ children, ...props }) => (
        <del className="md-del line-through text-text-muted" {...props}>
          {children}
        </del>
      ),

      /* ── Inline code ── */
      code: ({ className: codeClassName, children, ...props }) => {
        // Fenced code blocks get a className like "language-xxx" from rehype-highlight
        const match = /language-(\w+)/.exec(codeClassName ?? "");

        if (match) {
          const lang = match[1] ?? "text";
          const codeString = String(children).replace(/\n$/, "");

          return (
            <div className="group relative my-4 rounded-lg border border-border-default overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between bg-[#1e1e2e] px-4 py-2 border-b border-white/[0.06]">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-white/70">
                  {lang}
                </span>
                <CopyButton code={codeString} />
              </div>
              {/* Code body */}
              <pre className="!m-0 !rounded-none overflow-x-auto bg-[#1e1e2e] p-4">
                <code className={cn(codeClassName, "font-mono text-sm leading-relaxed")} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        }

        // Inline code
        return (
          <code
            className="md-inline-code rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[0.875em] text-text-primary"
            {...props}
          >
            {children}
          </code>
        );
      },

      /* ── Preformatted (fallback for code without language) ── */
      pre: ({ children, ...props }) => {
        // If the child is already a fenced code block rendered above, just pass through
        return (
          <pre className="md-pre" {...props}>
            {children}
          </pre>
        );
      },

      /* ── Blockquote ── */
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="md-blockquote my-4 rounded-r-lg border-l-4 border-accent-primary bg-bg-subtle/50 px-4 py-3 text-text-secondary"
          {...props}
        >
          {children}
        </blockquote>
      ),

      /* ── Lists ── */
      ul: ({ children, className: ulClassName, ...props }) => {
        // GFM task lists get a "contains-task-list" class
        const isTaskList = ulClassName?.includes("contains-task-list");
        return (
          <ul
            className={cn(
              "md-ul my-3 space-y-1",
              isTaskList ? "list-none pl-0" : "list-disc pl-6",
              ulClassName
            )}
            {...props}
          >
            {children}
          </ul>
        );
      },
      ol: ({ children, ...props }) => (
        <ol className="md-ol my-3 list-decimal space-y-1 pl-6" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, className: liClassName, ...props }) => {
        const isTask = liClassName?.includes("task-list-item");
        return (
          <li
            className={cn(
              "md-li text-text-primary",
              isTask && "md-task-list-item flex items-start gap-2",
              liClassName
            )}
            {...props}
          >
            {children}
          </li>
        );
      },

      /* ── Task list checkbox ── */
      input: ({ type, checked, ...props }) => {
        if (type === "checkbox") {
          return (
            <span
              className={cn(
                "mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition",
                checked
                  ? "border-accent-primary bg-accent-primary"
                  : "border-border-strong bg-transparent"
              )}
              role="checkbox"
              aria-checked={checked}
              {...props}
            >
              {checked ? (
                <svg
                  className="h-3 w-3 text-white"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6l2.5 2.5 4.5-5" />
                </svg>
              ) : null}
            </span>
          );
        }
        return <input type={type} {...props} />;
      },

      /* ── Horizontal rule ── */
      hr: (props) => <hr className="md-hr my-8 border-t border-border-default" {...props} />,

      /* ── Table (responsive wrapper with alternating rows) ── */
      table: ({ children, ...props }) => (
        <div className="md-table-wrapper my-4 overflow-x-auto rounded-lg border border-border-default">
          <table className="md-table w-full border-collapse text-sm" {...props}>
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead className="md-thead bg-bg-subtle" {...props}>
          {children}
        </thead>
      ),
      th: ({ children, ...props }) => (
        <th
          className="md-th whitespace-nowrap border-b-2 border-border-default px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
          {...props}
        >
          {children}
        </th>
      ),
      tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
      tr: ({ children, ...props }) => (
        <tr className="md-tr even:bg-bg-subtle/40" {...props}>
          {children}
        </tr>
      ),
      td: ({ children, ...props }) => (
        <td
          className="md-td border-b border-border-default px-4 py-2.5 text-text-primary"
          {...props}
        >
          {children}
        </td>
      ),

      /* ── Image ── */
      img: ({ src, alt, ...props }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          className="md-img my-4 max-w-full rounded-lg border border-border-default"
          loading="lazy"
          {...props}
        />
      ),
    }),
    []
  );

  return (
    <div className={cn(contentVariants({ variant }), className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
