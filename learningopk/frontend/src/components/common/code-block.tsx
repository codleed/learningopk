"use client";

import { useCallback, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for the standalone code display component. */
export interface CodeBlockProps {
  /** The source code string to render. */
  code: string;
  /** Programming language for syntax highlighting (e.g. "typescript", "python"). */
  language?: string;
  /** Optional filename displayed above the code block. */
  filename?: string;
  /** Whether to display line numbers in the gutter. */
  showLineNumbers?: boolean;
  /** Additional CSS class names for the outer wrapper. */
  className?: string;
}

/**
 * Standalone syntax-highlighted code block with copy-to-clipboard,
 * language badge, optional filename header, and line numbers.
 * Always renders with a dark background regardless of the active theme.
 */
export function CodeBlock({
  code,
  language = "text",
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in some contexts
    }
  }, [code]);

  const normalizedLang = language.toLowerCase();

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border-default overflow-hidden",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-[#1e1e2e] px-4 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* Language badge */}
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-white/70">
            {normalizedLang}
          </span>
          {/* Optional filename */}
          {filename ? (
            <span className="text-xs text-white/50 font-mono truncate max-w-48">{filename}</span>
          ) : null}
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition",
            "text-white/60 hover:text-white hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
          )}
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <SyntaxHighlighter
        language={normalizedLang}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "#1e1e2e",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          fontFamily: "var(--font-mono)",
        }}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "rgba(255,255,255,0.2)",
          userSelect: "none",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-mono)",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
