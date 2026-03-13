"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  noPadding?: boolean;
}

export function Card({
  children,
  className = "",
  style,
  noPadding = false,
  ...props
}: CardProps) {
  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    color: "var(--card-foreground)",
    border: "1px solid var(--border)",
    padding: noPadding ? "0" : "var(--space-4)",
    borderRadius: "8px",
    boxShadow: "var(--shadow-sm)",
    ...style,
  };

  return (
    <motion.div
      className={className}
      style={cardStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className = "", style, ...props }: CardHeaderProps) {
  return (
    <div
      className={className}
      style={{
        paddingBottom: "var(--space-3)",
        borderBottom: "1px solid var(--border)",
        marginBottom: "var(--space-3)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ children, className = "", style, ...props }: CardTitleProps) {
  return (
    <h3
      className={className}
      style={{
        fontFamily: "var(--font-heading)",
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "var(--card-foreground)",
        margin: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className = "", style, ...props }: CardContentProps) {
  return (
    <div className={className} style={style} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className = "", style, ...props }: CardFooterProps) {
  return (
    <div
      className={className}
      style={{
        paddingTop: "var(--space-3)",
        borderTop: "1px solid var(--border)",
        marginTop: "var(--space-3)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
