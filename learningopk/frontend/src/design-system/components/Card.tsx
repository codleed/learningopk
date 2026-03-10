"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

export type PastelAccent = 
  | "dustyRose" 
  | "sage" 
  | "slateBlue" 
  | "warmSand" 
  | "lavender" 
  | "peach"
  | "none";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  pastelAccent?: PastelAccent;
  noPadding?: boolean;
}

const pastelGradients: Record<PastelAccent, string> = {
  dustyRose: "linear-gradient(135deg, rgba(212,165,165,0.15) 0%, rgba(212,165,165,0.05) 100%)",
  sage: "linear-gradient(135deg, rgba(165,196,165,0.15) 0%, rgba(165,196,165,0.05) 100%)",
  slateBlue: "linear-gradient(135deg, rgba(165,180,196,0.15) 0%, rgba(165,180,196,0.05) 100%)",
  warmSand: "linear-gradient(135deg, rgba(212,196,165,0.15) 0%, rgba(212,196,165,0.05) 100%)",
  lavender: "linear-gradient(135deg, rgba(196,165,212,0.15) 0%, rgba(196,165,212,0.05) 100%)",
  peach: "linear-gradient(135deg, rgba(212,184,165,0.15) 0%, rgba(212,184,165,0.05) 100%)",
  none: "transparent",
};

const pastelBorderColors: Record<PastelAccent, string> = {
  dustyRose: "rgba(212,165,165,0.4)",
  sage: "rgba(165,196,165,0.4)",
  slateBlue: "rgba(165,180,196,0.4)",
  warmSand: "rgba(212,196,165,0.4)",
  lavender: "rgba(196,165,212,0.4)",
  peach: "rgba(212,184,165,0.4)",
  none: "var(--border)",
};

export function Card({
  children,
  className = "",
  style,
  pastelAccent = "none",
  noPadding = false,
  ...props
}: CardProps) {
  const cardStyle: React.CSSProperties = {
    background: `var(--card-gradient, var(--card))`,
    backgroundImage: pastelGradients[pastelAccent],
    color: "var(--card-foreground)",
    border: `1px solid ${pastelBorderColors[pastelAccent]}`,
    padding: noPadding ? "0" : "var(--space-4)",
    borderRadius: "12px",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
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
