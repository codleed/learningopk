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
  /** When true the component stretches to fill its parent height —
   *  the expand/collapse button is hidden and the iframe uses 100 % height. */
  fillHeight?: boolean;
};

/* ─── Constants ─── */

const DEFAULT_TITLE = "Interactive Visualization";
const IFRAME_HEIGHT_DEFAULT = 400;
const IFRAME_HEIGHT_EXPANDED = 600;

/**
 * CSS injected into the srcdoc when `fillHeight` or fullscreen mode is active.
 * Forces the visualization content to fit inside the iframe without scrolling.
 */
const FIT_VIEWPORT_STYLE = `<style data-fit>html,body{margin:0!important;overflow:auto!important}body>*:first-child{max-width:100%!important}</style>`;

/** Inject fit-viewport styles into an HTML string. */
function injectFitStyles(html: string): string {
  // Insert right after <head> or at the very beginning
  if (html.includes("</head>")) {
    return html.replace("</head>", `${FIT_VIEWPORT_STYLE}</head>`);
  }
  return FIT_VIEWPORT_STYLE + html;
}

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
        Visualizations are generated for numerical and graphical problems to help you understand
        concepts better.
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
  height: number | string;
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
  fillHeight?: boolean;
};

function VisualizationFrame({ srcdoc, height, fillHeight }: VisualizationFrameProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const reduced = useReducedMotion();

  const handleIframeLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  if (fillHeight) {
    const contained = injectFitStyles(srcdoc);
    return (
      <div className="relative flex-1 min-h-0 bg-white">
        {!isLoaded && (
          <div className="absolute inset-0 z-10 bg-bg-surface">
            <LoadingSkeleton height={height} />
          </div>
        )}

        <div className="h-full overflow-hidden">
          <SandboxedIframe
            key={srcdoc}
            srcdoc={contained}
            height="100%"
            onLoad={handleIframeLoad}
            className={cn(
              "transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>
    );
  }

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
          className={cn("transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0")}
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
  const contained = injectFitStyles(srcdoc);

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

  /* Prevent body scroll while fullscreen is open */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      variants={reduced ? undefined : overlayVariants}
      initial={reduced ? false : "hidden"}
      animate={reduced ? undefined : "visible"}
      exit={reduced ? undefined : "exit"}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} - fullscreen`}
    >
      {/* Floating close button */}
      <div className="absolute right-3 top-3 z-10">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          shape="square"
          onClick={onClose}
          aria-label="Exit fullscreen"
          className="bg-black/60 border-white/20 text-white hover:bg-black/80 backdrop-blur-sm"
          iconLeft={<X className="h-4 w-4" />}
        />
      </div>

      {/* Floating title pill */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
        <SparkleIcon className="text-white" />
        <span className="font-[var(--font-display)] text-xs font-medium text-white/90">
          {title}
        </span>
      </div>

      {/* Full-screen iframe — edge to edge */}
      <div className="relative flex-1 min-h-0">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface">
            <LoadingSkeleton height={400} />
          </div>
        )}
        <SandboxedIframe
          srcdoc={contained}
          height="100%"
          onLoad={handleLoad}
          className={cn(
            "h-full bg-white transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
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
  fillHeight,
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
          fillHeight && "h-full flex flex-col",
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
              {/* Expand / collapse toggle — hidden when fillHeight */}
              {!fillHeight && (
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
              )}

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
          <div className={cn(fillHeight && "flex-1 min-h-0")}>
            <EmptyState />
          </div>
        ) : (
          <VisualizationFrame
            key={visualizationHtml}
            srcdoc={visualizationHtml}
            height={currentHeight}
            fillHeight={fillHeight}
          />
        )}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && hasVisualization && (
          <FullscreenModal srcdoc={visualizationHtml} title={title} onClose={closeFullscreen} />
        )}
      </AnimatePresence>
    </>
  );
}
