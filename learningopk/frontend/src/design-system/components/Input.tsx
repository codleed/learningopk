"use client";

import { forwardRef } from "react";

export type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  error?: boolean;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
    padding: "0.375rem 0.625rem",
    fontSize: "0.75rem",
    minHeight: "2rem",
  },
  md: {
    padding: "0.625rem 1rem",
    fontSize: "1rem",
    minHeight: "3rem",
  },
  lg: {
    padding: "0.75rem 1.25rem",
    fontSize: "1.125rem",
    minHeight: "3.5rem",
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", style, size = "md", error, disabled, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: "var(--font-body)",
      width: "100%",
      backgroundColor: "var(--card)",
      color: "var(--foreground)",
      border: `2px solid ${error ? "var(--destructive)" : "var(--input)"}`,
      outline: "none",
      boxShadow: "none",
      transition: "all 0.2s ease",
      borderRadius: "8px",
      ...sizeStyles[size],
      ...style,
    };

    return (
      <input
        ref={ref}
        className={className}
        style={baseStyle}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", style, error, disabled, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: "var(--font-body)",
      width: "100%",
      backgroundColor: "var(--card)",
      color: "var(--foreground)",
      border: `2px solid ${error ? "var(--destructive)" : "var(--input)"}`,
      padding: "0.75rem",
      fontSize: "1rem",
      minHeight: "6rem",
      resize: "vertical",
      outline: "none",
      transition: "all 0.2s ease",
      borderRadius: "8px",
      ...style,
    };

    return (
      <textarea
        ref={ref}
        className={className}
        style={baseStyle}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
