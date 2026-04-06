"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

type NumericalVisualizationRendererProps = {
  /** The raw HTML/CSS/JS string to render inside the sandboxed iframe. */
  visualizationHtml: string | null | undefined;
  /** Optional header title override. */
  title?: string;
  /** Additional CSS classes for the outer container. */
  className?: string;
};

/* ─── Constants ─── */

const DEFAULT_TITLE = "Interactive Visualization";
const IFRAME_HEIGHT_DEFAULT = 400;
const IFRAME_HEIGHT_EXPANDED = 600;

/**
 * Strict sandbox policy for the visualization iframe.
 * Allows scripts for interactivity but blocks same-origin, forms, and popups.
 */
const IFRAME_SANDBOX = "allow-scripts";

/* ─── Overlay animation variants ─── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 360, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 24,
    transition: { duration: 0.2, ease: "easeIn" },
  },
} as const;

/* ─── Sparkle icon ─── */

function SparkleIcon({ className }: { className?: string }) {
  return <Sparkles className={cn("h-4 w-4 text-accent-primary", className)} aria-hidden />;
}

/* ─── Empty state ─── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle">
        <Sparkles className="h-5 w-5 text-text-muted" aria-hidden />
      </div>
      <p className="text-sm font-medium text-text-secondary">
        No visualization available for this problem
      </p>
      <p className="max-w-xs text-xs text-text-muted">
        Visualizations are generated for numerical and graphical problems to help you understand concepts better.
      </p>
    </div>
  );
}

/* ─── Loading skeleton ─── */

function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-6"
      style={{ height }}
      aria-label="Loading visualization"
    >
      <Skeleton variant="rectangular" className="h-4 w-48" />
      <Skeleton variant="rectangular" className="h-48 w-full max-w-md" />
      <div className="flex gap-3">
        <Skeleton variant="rectangular" className="h-3 w-24" />
        <Skeleton variant="rectangular" className="h-3 w-16" />
      </div>
    </div>
  );
}

/* ─── Sandboxed iframe ─── */

type SandboxedIframeProps = {
  srcdoc: string;
  height: number;
  onLoad: () => void;
  className?: string;
};

function SandboxedIframe({ srcdoc, height, onLoad, className }: SandboxedIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox={IFRAME_SANDBOX}
      title="Numerical visualization"
      onLoad={onLoad}
      className={cn("w-full border-0", className)}
      style={{ height }}
      aria-label="Interactive numerical visualization content"
    />
  );
}

type VisualizationFrameProps = {
  srcdoc: string;
  height: number;
};

function VisualizationFrame({ srcdoc, height }: VisualizationFrameProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const reduced = useReducedMotion();

  const handleIframeLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="relative bg-white">
      {!isLoaded && (
        <div className="absolute inset-0 z-10 bg-bg-surface">
          <LoadingSkeleton height={height} />
        </div>
      )}

      <motion.div
        animate={{ height }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
        className="overflow-hidden"
      >
        <SandboxedIframe
          key={srcdoc}
          srcdoc={srcdoc}
          height={height}
          onLoad={handleIframeLoad}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </motion.div>
    </div>
  );
}

/* ─── Fullscreen modal ─── */

type FullscreenModalProps = {
  srcdoc: string;
  title: string;
  onClose: () => void;
};

function FullscreenModal({ srcdoc, title, onClose }: FullscreenModalProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const reduced = useReducedMotion();

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  /* Close on Escape key */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /* Prevent body scroll while modal is open */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
      variants={reduced ? undefined : overlayVariants}
      initial={reduced ? false : "hidden"}
      animate={reduced ? undefined : "visible"}
      exit={reduced ? undefined : "exit"}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} - fullscreen`}
    >
      <motion.div
        className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[var(--shadow-elevated)]"
        variants={reduced ? undefined : modalVariants}
        initial={reduced ? false : "hidden"}
        animate={reduced ? undefined : "visible"}
        exit={reduced ? undefined : "exit"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface px-5 py-3">
          <div className="flex items-center gap-2">
            <SparkleIcon />
            <span className="font-[var(--font-display)] text-sm font-semibold text-text-primary">
              {title}
            </span>
            <Badge variant="primary" size="sm">
              Fullscreen
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            shape="square"
            onClick={onClose}
            aria-label="Close fullscreen visualization"
            iconLeft={<X className="h-4 w-4" />}
          />
        </div>

        {/* Modal iframe container */}
        <div className="relative flex-1 overflow-hidden bg-white">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-surface">
              <LoadingSkeleton height={400} />
            </div>
          )}
          <SandboxedIframe
            srcdoc={srcdoc}
            height={-1}
            onLoad={handleLoad}
            className={cn(
              "h-full transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main component ─── */

/**
 * Renders an HTML/CSS/JS visualization inside a strictly sandboxed iframe.
 *
 * Used in the student-facing learn views to display interactive numerical
 * visualizations (graphs, diagrams, interactive explorations) alongside
 * problem content.
 *
 * Security: The iframe uses `sandbox="allow-scripts"` with NO allow-same-origin,
 * NO allow-forms, and NO allow-popups to prevent untrusted code from accessing
 * the parent page or navigating.
 */
export function NumericalVisualizationRenderer({
  visualizationHtml,
  title = DEFAULT_TITLE,
  className,
}: NumericalVisualizationRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasVisualization =
    typeof visualizationHtml === "string" && visualizationHtml.trim().length > 0;

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const currentHeight = isExpanded ? IFRAME_HEIGHT_EXPANDED : IFRAME_HEIGHT_DEFAULT;

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border-default bg-bg-surface",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <SparkleIcon />
            <span className="font-[var(--font-display)] text-sm font-medium text-text-primary">
              {title}
            </span>
            <Badge variant="primary" size="sm">
              Interactive
            </Badge>
          </div>

          {hasVisualization && (
            <div className="flex items-center gap-1">
              {/* Expand / collapse toggle */}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                shape="square"
                onClick={toggleExpanded}
                aria-label={isExpanded ? "Collapse visualization" : "Expand visualization"}
                iconLeft={
                  isExpanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )
                }
              />

              {/* Fullscreen button */}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={openFullscreen}
                aria-label="Open visualization in fullscreen"
                iconLeft={<Maximize2 className="h-3.5 w-3.5" />}
              >
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {!hasVisualization ? (
          <EmptyState />
        ) : (
          <VisualizationFrame
            key={visualizationHtml}
            srcdoc={visualizationHtml}
            height={currentHeight}
          />
        )}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && hasVisualization && (
          <FullscreenModal
            srcdoc={visualizationHtml}
            title={title}
            onClose={closeFullscreen}
          />
        )}
      </AnimatePresence>
    </>
  );
}
