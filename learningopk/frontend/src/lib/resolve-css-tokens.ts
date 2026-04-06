"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// CSS Variable → Resolved Value resolver for canvas-based libraries (ECharts)
// ---------------------------------------------------------------------------
//
// ECharts renders to <canvas>, which has no access to CSS custom properties.
// This module resolves CSS variables to their computed values using
// getComputedStyle, caches aggressively, and re-resolves when the theme
// changes (detected via MutationObserver on `<html>` class attribute).
// ---------------------------------------------------------------------------

/** The set of design-system tokens we resolve for chart usage. */
const TOKEN_MAP = {
  accentPrimary: "--accent-primary",
  accentPrimaryHover: "--accent-primary-hover",
  accentSuccess: "--accent-success",
  accentWarning: "--accent-warning",
  accentDanger: "--accent-danger",
  accentInfo: "--accent-info",
  textPrimary: "--text-primary",
  textSecondary: "--text-secondary",
  textMuted: "--text-muted",
  bgBase: "--bg-base",
  bgSurface: "--bg-surface",
  bgElevated: "--bg-elevated",
  borderDefault: "--border-default",
  chart1: "--chart-1",
  chart2: "--chart-2",
  chart3: "--chart-3",
  chart4: "--chart-4",
  chart5: "--chart-5",
} as const;

/** Resolved token values — all strings (hex, rgba, etc.) */
export type ResolvedTokens = {
  [K in keyof typeof TOKEN_MAP]: string;
};

/** SSR / fallback values (dark theme defaults) */
const SSR_FALLBACK: ResolvedTokens = {
  accentPrimary: "#6366F1",
  accentPrimaryHover: "#7C7FF5",
  accentSuccess: "#22C55E",
  accentWarning: "#F59E0B",
  accentDanger: "#EF4444",
  accentInfo: "#38BDF8",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  bgBase: "#0D0F17",
  bgSurface: "#151825",
  bgElevated: "#1E2235",
  borderDefault: "rgba(255, 255, 255, 0.08)",
  chart1: "#6366F1",
  chart2: "#22C55E",
  chart3: "#F59E0B",
  chart4: "#38BDF8",
  chart5: "#EF4444",
};

// ---------------------------------------------------------------------------
// Module-level singleton store
// ---------------------------------------------------------------------------

/** The latest resolved snapshot. */
let currentSnapshot: ResolvedTokens = SSR_FALLBACK;

/** Set of subscribed listeners (for useSyncExternalStore). */
const listeners = new Set<() => void>();

/** Whether we've attached the MutationObserver already. */
let observerAttached = false;

/** Resolve all tokens from the live DOM. */
function resolveFromDOM(): ResolvedTokens {
  if (typeof document === "undefined") return SSR_FALLBACK;

  const styles = getComputedStyle(document.documentElement);
  const resolved = {} as Record<string, string>;

  for (const [key, cssVar] of Object.entries(TOKEN_MAP)) {
    const value = styles.getPropertyValue(cssVar).trim();
    resolved[key] = value || (SSR_FALLBACK as Record<string, string>)[key];
  }

  return resolved as ResolvedTokens;
}

/** Emit to all subscribers so React re-renders. */
function emitChange() {
  currentSnapshot = resolveFromDOM();
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Lazily attach a MutationObserver on the `<html>` element's `class` attribute.
 * When the class changes (light ↔ dark), we re-resolve all tokens.
 */
function ensureObserver() {
  if (observerAttached || typeof document === "undefined") return;
  observerAttached = true;

  // Initial resolve
  currentSnapshot = resolveFromDOM();

  const observer = new MutationObserver(() => {
    // Slight delay to let CSS variables settle after class toggle
    requestAnimationFrame(() => {
      emitChange();
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function subscribe(callback: () => void): () => void {
  ensureObserver();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): ResolvedTokens {
  ensureObserver();
  return currentSnapshot;
}

function getServerSnapshot(): ResolvedTokens {
  return SSR_FALLBACK;
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * React hook that returns resolved CSS custom property values for use in
 * canvas-based libraries like ECharts.
 *
 * - Resolves `var(--accent-primary)` → `"#6366F1"` etc.
 * - Caches aggressively — only re-resolves when the theme class changes.
 * - SSR-safe — returns dark theme fallbacks on the server.
 *
 * @example
 * ```tsx
 * const tokens = useResolvedTokens();
 * // tokens.accentPrimary === "#6366F1"
 * // tokens.chart1 === "#6366F1"
 * ```
 */
export function useResolvedTokens(): ResolvedTokens {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Imperative resolver for one-off use outside React components.
 * Prefers cached values; call `forceResolve()` to bust the cache.
 */
export function getResolvedTokens(): ResolvedTokens {
  ensureObserver();
  return currentSnapshot;
}

/**
 * Force re-resolution of all tokens. Useful after programmatic theme changes
 * that don't go through the class attribute (edge case).
 */
export function forceResolve(): void {
  emitChange();
}
