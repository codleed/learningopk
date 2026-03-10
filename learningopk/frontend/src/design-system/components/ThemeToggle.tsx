"use client";

import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { mode, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className={className}
      style={{
        width: "2.5rem",
        height: "2.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.6)",
        color: "var(--foreground)",
        border: "2px solid var(--border)",
        borderRadius: "12px",
        cursor: "pointer",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: mode === "light" ? 0 : 180 }}
        transition={{ duration: 0.2 }}
      >
        {mode === "light" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </motion.div>
    </motion.button>
  );
}
