"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

/* ─── Lazy-load ContentRenderer (heavy markdown deps) ─── */
const ContentRenderer = dynamic(
  () =>
    import("@/components/common/content-renderer").then(
      (mod) => mod.ContentRenderer,
    ),
  { ssr: false },
);

/**
 * Props for the AI streaming text component.
 * Renders text word-by-word while streaming, then switches to
 * full markdown rendering when streaming completes.
 */
export interface StreamingTextProps {
  /** The full or partial text content to display. */
  content: string;
  /** Whether text is actively streaming from the AI backend. */
  isStreaming: boolean;
  /** Render final content through the markdown pipeline when streaming ends. */
  enableMarkdown?: boolean;
  /** Character shown as the blinking cursor during streaming. */
  cursorChar?: string;
  /** Additional CSS class names for the wrapper element. */
  className?: string;
}

/**
 * Streaming text renderer for AI tutor chat.
 *
 * While `isStreaming` is true, renders plain text with a blinking cursor.
 * When streaming completes, renders the full content through `ContentRenderer`
 * (dynamically imported to keep bundle size small for initial chat load).
 */
export function StreamingText({
  content,
  isStreaming,
  enableMarkdown = true,
  cursorChar = "▋",
  className,
}: StreamingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevContentLenRef = useRef(0);

  /* ─── Incrementally reveal characters as content grows ─── */
  useEffect(() => {
    if (content.length === 0) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplayedLength(0);
      });
      prevContentLenRef.current = 0;
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }

    if (!isStreaming) {
      // When streaming stops, show full content immediately
      rafRef.current = requestAnimationFrame(() => {
        setDisplayedLength(content.length);
      });
      prevContentLenRef.current = content.length;
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }

    // When new content arrives, animate reveal
    if (content.length > prevContentLenRef.current) {
      const targetLength = content.length;

      const animate = () => {
        setDisplayedLength((prev) => {
          if (prev >= targetLength) return prev;
          // Reveal in small steps for a natural word-by-word feel
          const step = Math.max(1, Math.ceil((targetLength - prev) / 3));
          return Math.min(prev + step, targetLength);
        });

        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    }

    prevContentLenRef.current = content.length;

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [content, isStreaming]);

  /* ─── Displayed text during streaming ─── */
  const displayedText = useMemo(
    () => content.slice(0, displayedLength),
    [content, displayedLength],
  );

  /* ─── Streaming: plain text + cursor ─── */
  if (isStreaming) {
    return (
      <div className={cn("whitespace-pre-wrap leading-relaxed text-text-primary", className)}>
        {displayedText}
        <AnimatePresence>
          <motion.span
            className="ml-0.5 inline-block text-accent-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            aria-hidden="true"
          >
            {cursorChar}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  /* ─── Done streaming: full markdown render ─── */
  if (enableMarkdown) {
    return (
      <ContentRenderer
        content={content}
        variant="ai-message"
        className={className}
      />
    );
  }

  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed text-text-primary", className)}>
      {content}
    </div>
  );
}
