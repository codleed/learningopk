"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════
   ThemeToggle — Two-state segmented control
   ═══════════════════════════════════════════ */

type ThemeMode = "light" | "dark";

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
};

/** Props for the ThemeToggle component. */
export interface ThemeToggleProps {
  /** Additional CSS classes. */
  className?: string;
  /** Show text labels next to icons. Defaults to true. */
  showLabels?: boolean;
}

/** Coerce any theme value to a valid ThemeMode, falling back to "dark". */
function resolveTheme(raw: string | undefined): ThemeMode {
  if (raw === "light" || raw === "dark") return raw;
  return "dark";
}

/**
 * Two-state theme toggle using next-themes.
 *
 * Renders a segmented control for light/dark with animated active indicator.
 */
export function ThemeToggle({ className, showLabels = true }: ThemeToggleProps) {
  const { theme: rawTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  // Migrate stale "system" value left over from the old 3-state toggle
  const theme = resolveTheme(rawTheme);
  if (mounted && rawTheme !== theme) {
    setTheme(theme);
  }

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      const modes: ThemeMode[] = ["light", "dark"];
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

      const buttons =
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[newIndex]?.focus();
    },
    [setTheme]
  );

  const modes: ThemeMode[] = ["light", "dark"];

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
          <div key={m} className="h-8 w-8 rounded-lg bg-bg-subtle animate-pulse" aria-hidden />
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
        const Icon = themeConfig[m].icon;

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
              isActive ? "text-white" : "text-text-muted hover:text-text-primary hover:bg-bg-subtle"
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
              <Icon className="h-4 w-4" aria-hidden />
              {showLabels ? <span className="hidden sm:inline">{themeConfig[m].label}</span> : null}
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
 * Compact single-button theme toggle that cycles through light → dark.
 *
 * Uses Framer Motion AnimatePresence for smooth icon swap animation.
 */
export function ThemeToggleCompact({ className }: ThemeToggleCompactProps) {
  const { theme: rawTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  // Migrate stale "system" value left over from the old 3-state toggle
  const currentTheme = resolveTheme(rawTheme);
  if (mounted && rawTheme !== currentTheme) {
    setTheme(currentTheme);
  }

  const toggle = useCallback(() => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [currentTheme, setTheme]);

  if (!mounted) {
    return (
      <button
        className={cn("h-10 w-10 rounded-lg bg-bg-subtle animate-pulse", className)}
        aria-label="Theme toggle"
        disabled
      />
    );
  }

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
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-5 w-5" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
