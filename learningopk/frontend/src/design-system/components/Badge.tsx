"use client";

import { type HTMLAttributes, type ReactNode } from "react";

export type BadgeVariant = "neutral" | "dustyRose" | "sage" | "slateBlue" | "warmSand" | "lavender" | "peach";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  neutral: {
    backgroundColor: "rgba(128,128,128,0.2)",
    color: "var(--muted-foreground)",
    border: "1px solid rgba(128,128,128,0.3)",
  },
  dustyRose: {
    backgroundColor: "rgba(212,165,165,0.3)",
    color: "#8b5a5a",
    border: "1px solid rgba(212,165,165,0.5)",
  },
  sage: {
    backgroundColor: "rgba(165,196,165,0.3)",
    color: "#5a8b5a",
    border: "1px solid rgba(165,196,165,0.5)",
  },
  slateBlue: {
    backgroundColor: "rgba(165,180,196,0.3)",
    color: "#5a6b8b",
    border: "1px solid rgba(165,180,196,0.5)",
  },
  warmSand: {
    backgroundColor: "rgba(212,196,165,0.3)",
    color: "#8b7a5a",
    border: "1px solid rgba(212,196,165,0.5)",
  },
  lavender: {
    backgroundColor: "rgba(196,165,212,0.3)",
    color: "#7a5a8b",
    border: "1px solid rgba(196,165,212,0.5)",
  },
  peach: {
    backgroundColor: "rgba(212,184,165,0.3)",
    color: "#8b6a5a",
    border: "1px solid rgba(212,184,165,0.5)",
  },
};

export function Badge({
  children,
  className = "",
  variant = "neutral",
  style,
  ...props
}: BadgeProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.25rem 0.5rem",
    display: "inline-flex",
    alignItems: "center",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderRadius: "12px",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span className={className} style={baseStyle} {...props}>
      {children}
    </span>
  );
}
