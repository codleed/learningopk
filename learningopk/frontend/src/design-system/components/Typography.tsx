import { type HTMLAttributes } from "react";

type TypographyProps = HTMLAttributes<HTMLHeadingElement>;

export function H1({ className = "", style, ...props }: TypographyProps) {
  return (
    <h1
      className={`text-4xl font-bold tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-heading)", ...style }}
      {...props}
    />
  );
}

export function H2({ className = "", style, ...props }: TypographyProps) {
  return (
    <h2
      className={`text-3xl font-semibold tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-heading)", ...style }}
      {...props}
    />
  );
}

export function H3({ className = "", style, ...props }: TypographyProps) {
  return (
    <h3
      className={`text-2xl font-semibold ${className}`}
      style={{ fontFamily: "var(--font-heading)", ...style }}
      {...props}
    />
  );
}

export function H4({ className = "", style, ...props }: TypographyProps) {
  return (
    <h4
      className={`text-xl font-medium ${className}`}
      style={{ fontFamily: "var(--font-heading)", ...style }}
      {...props}
    />
  );
}

interface BodyProps extends HTMLAttributes<HTMLParagraphElement> {
  muted?: boolean;
}

export function Body({ className = "", style, muted, ...props }: BodyProps) {
  return (
    <p
      className={`text-base ${muted ? "text-foreground-500" : ""} ${className}`}
      style={{ fontFamily: "var(--font-body)", ...style }}
      {...props}
    />
  );
}

type LabelProps = HTMLAttributes<HTMLLabelElement>;

export function Label({ className = "", style, ...props }: LabelProps) {
  return (
    <label
      className={`text-sm font-medium ${className}`}
      style={{ fontFamily: "var(--font-body)", ...style }}
      {...props}
    />
  );
}

type CaptionProps = HTMLAttributes<HTMLSpanElement>;

export function Caption({ className = "", style, ...props }: CaptionProps) {
  return (
    <span
      className={`text-small text-foreground-400 ${className}`}
      style={{ fontFamily: "var(--font-body)", ...style }}
      {...props}
    />
  );
}

type MonoProps = HTMLAttributes<HTMLSpanElement>;

export function Mono({ className = "", style, ...props }: MonoProps) {
  return (
    <code
      className={`text-sm bg-default-100 px-2 py-1 rounded ${className}`}
      style={{ fontFamily: "var(--font-mono)", ...style }}
      {...props}
    />
  );
}
