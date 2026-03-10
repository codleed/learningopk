"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: "0.375rem 0.75rem",
    fontSize: "0.75rem",
    minHeight: "2rem",
  },
  md: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    minHeight: "2.5rem",
  },
  lg: {
    padding: "0.625rem 1.25rem",
    fontSize: "1rem",
    minHeight: "3rem",
  },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    border: "2px solid var(--primary)",
  },
  secondary: {
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    border: "2px solid var(--border)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--foreground)",
    border: "2px solid transparent",
  },
};

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: fullWidth ? "100%" : "auto",
    borderRadius: "12px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    background: variant === "primary" 
      ? "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 80%, black) 100%)"
      : variantStyles[variant].backgroundColor,
    transition: "all 0.2s ease",
    boxShadow: variant === "primary" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <motion.button
      className={className}
      style={baseStyle}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
