"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, type AppTheme } from "@/lib/theme";

/* ═══════════════════════════════════════════════════════════════
   ThemeSeal — text stamp that swaps Day/Night reading modes.
   Dark is the default; light mode is the `.light` class on <html>.
   Reads the resolved theme via useSyncExternalStore so the SSR
   markup stays "dark" and hydration settles without an effect
   that sets state.
   ═══════════════════════════════════════════════════════════════ */

const subscribeTheme = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

export function ThemeSeal() {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => !document.documentElement.classList.contains("light"),
    () => true
  );

  return (
    <button
      type="button"
      onClick={() => {
        const next: AppTheme = isDark ? "light" : "dark";
        applyTheme(next);
      }}
      aria-label={isDark ? "Switch to day (light) mode" : "Switch to night (dark) mode"}
      className="rounded-[6px] border border-hairline-strong px-2 py-1 text-caption text-ink-soft hover:border-accent hover:text-accent"
    >
      {isDark ? "Day" : "Night"}
    </button>
  );
}
