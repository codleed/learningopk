"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════
   ThemeToggle — Three-state segmented control
   ═══════════════════════════════════════════ */

type ThemeMode = "light" | "dark" | "system";

const themeConfig: Record<ThemeMode, { icon: typeof Sun; label: string; ariaLabel: string }> = {
  light: {
    icon: Sun,
    label: "Light",
    ariaLabel: "Switch to light theme",
  },
  dark: {
    icon: Moon,
    label: "Dark",
    ariaLabel: "Switch to dark theme",
  },
  system: {
    icon: Sun, // placeholder, replaced inline
    label: "System",
    ariaLabel: "Switch to system theme",
  },
};

/** Props for the ThemeToggle component. */
export interface ThemeToggleProps {
  /** Additional CSS classes. */
  className?: string;
  /** Show text labels next to icons. Defaults to true. */
  showLabels?: boolean;
}

/**
 * Three-state theme toggle using next-themes.
 *
 * Renders a segmented control for light/dark/system with animated active indicator.
 */
export function ThemeToggle({
  className,
  showLabels = true,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      const modes: ThemeMode[] = ["light", "dark", "system"];
      let newIndex = currentIndex;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
          break;
        case "ArrowRight":
        case "ArrowDown":
          newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
          break;
        case "Home":
          newIndex = 0;
          break;
        case "End":
          newIndex = modes.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      setTheme(modes[newIndex]!);

      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]'
      );
      buttons?.[newIndex]?.focus();
    },
    [setTheme]
  );

  const modes: ThemeMode[] = ["light", "dark", "system"];

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1",
          className
        )}
        aria-label="Theme toggle"
      >
        {modes.map((m) => (
          <div
            key={m}
            className="h-8 w-8 rounded-lg bg-bg-subtle animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Theme selection"
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1",
        className
      )}
    >
      {modes.map((m, index) => {
        const isActive = theme === m;
        const Icon = m === "system" ? Sun : themeConfig[m].icon;

        return (
          <button
            key={m}
            role="tab"
            type="button"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-label={themeConfig[m].ariaLabel}
            onClick={() => setTheme(m)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
              isActive
                ? "text-white"
                : "text-text-muted hover:text-text-primary hover:bg-bg-subtle"
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="theme-toggle-indicator"
                className="absolute inset-0 rounded-lg bg-accent-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}

            <span className="relative z-10 flex items-center gap-1.5">
              {m === "system" ? (
                <span className="h-4 w-4 flex items-center justify-center">
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 2v12A6 6 0 008 2z" />
                  </svg>
                </span>
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
              {showLabels ? (
                <span className="hidden sm:inline">
                  {themeConfig[m].label}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ThemeToggleCompact — Single icon button cycle
   ═══════════════════════════════════════════ */

/** Props for the ThemeToggleCompact component. */
export interface ThemeToggleCompactProps {
  /** Additional CSS classes. */
  className?: string;
  /**
   * Whether the parent container is collapsed.
   * @deprecated No longer affects rendering. Accepted for backward compatibility.
   */
  isCollapsed?: boolean;
}

/**
 * Compact single-button theme toggle that cycles through light → dark → system.
 *
 * Uses Framer Motion AnimatePresence for smooth icon swap animation.
 */
export function ThemeToggleCompact({ className, isCollapsed: _isCollapsed }: ThemeToggleCompactProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
  }, [theme, setTheme]);

  if (!mounted) {
    return (
      <button
        className={cn(
          "h-10 w-10 rounded-lg bg-bg-subtle animate-pulse",
          className
        )}
        aria-label="Theme toggle"
        disabled
      />
    );
  }

  const currentTheme = (theme ?? "system") as ThemeMode;
  const label = `Current theme: ${themeConfig[currentTheme].label}. Click to change.`;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-lg",
        "text-text-secondary hover:text-text-primary hover:bg-bg-subtle",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        className
      )}
      aria-label={label}
    >
      <AnimatePresence mode="wait">
        {currentTheme === "dark" ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-5 w-5" aria-hidden />
          </motion.span>
        ) : currentTheme === "light" ? (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-5 w-5" aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            key="system"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M10 0a10 10 0 100 20 10 10 0 000-20zm0 2.5v15a7.5 7.5 0 000-15z" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
