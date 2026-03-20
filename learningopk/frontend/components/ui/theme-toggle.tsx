"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

const THEME_STORAGE_KEY = "learningo-theme-mode";

const themeConfig = {
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
    icon: Monitor,
    label: "System",
    ariaLabel: "Switch to system theme",
  },
} as const;

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function ThemeToggle({
  className,
  showLabels = true,
}: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyTheme(mode === "system" ? getSystemTheme() : mode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "system") {
        applyTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      applyTheme(newMode === "system" ? getSystemTheme() : newMode);
    },
    []
  );

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
      handleModeChange(modes[newIndex]);

      const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[newIndex]?.focus();
    },
    [handleModeChange]
  );

  const modes: ThemeMode[] = ["light", "dark", "system"];

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-transparent p-1",
          className
        )}
        aria-label="Theme toggle"
      >
        {modes.map((m) => (
          <div
            key={m}
            className="h-8 w-8 rounded-lg bg-muted"
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
        "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-white/80 p-1 shadow-sm",
        "dark:bg-card/50 dark:backdrop-blur-sm",
        className
      )}
    >
      {modes.map((m, index) => {
        const config = themeConfig[m];
        const Icon = config.icon;
        const isActive = mode === m;

        return (
          <button
            key={m}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            aria-label={config.ariaLabel}
            onClick={() => handleModeChange(m)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isActive && "scale-110"
              )}
              aria-hidden
            />
            {showLabels && (
              <span className={cn("hidden sm:inline", isActive && "font-semibold")}>
                {config.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggleCompact({
  className,
}: {
  className?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return getStoredTheme();
    }
    return "system";
  });

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    applyTheme(nextMode === "system" ? getSystemTheme() : nextMode);
  }, [mode]);

  const currentConfig = themeConfig[mode];
  const Icon = currentConfig.icon;

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border border-border",
        "bg-white/80 backdrop-blur-sm shadow-sm",
        "dark:bg-card/50 dark:backdrop-blur-sm",
        "text-foreground transition-all duration-200",
        "hover:border-[var(--primary)]/40 hover:bg-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Current theme: ${currentConfig.label}. Click to change.`}
    >
      <span className="transition-transform duration-200 hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
    </button>
  );
}
