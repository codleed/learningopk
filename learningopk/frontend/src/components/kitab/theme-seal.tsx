"use client";

import { useTheme } from "next-themes";

/* ═══════════════════════════════════════════════════════════════
   ThemeSeal — text stamp that swaps Day/Night reading modes.
   Single store: next-themes (`theme` key, class on <html>).
   resolvedTheme is undefined during SSR/hydration — fall back to
   "dark" so the label matches the server markup.
   ═══════════════════════════════════════════════════════════════ */

export function ThemeSeal() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to day (light) mode" : "Switch to night (dark) mode"}
      className="rounded-[6px] border border-hairline-strong px-2 py-1 text-caption text-ink-soft hover:border-accent hover:text-accent"
    >
      {isDark ? "Day" : "Night"}
    </button>
  );
}
