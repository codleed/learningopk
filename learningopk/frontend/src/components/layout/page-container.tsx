"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  headerExtra?: ReactNode;
  children?: ReactNode;
  contentPadding?: "none" | "sm" | "md" | "lg";
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

const contentPaddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function PageContainer({
  title,
  subtitle,
  breadcrumbs,
  actions,
  headerExtra,
  children,
  contentPadding = "md",
  className,
  headerClassName,
  contentClassName,
}: PageContainerProps) {
  const hasHeader = title || subtitle || breadcrumbs || actions || headerExtra;

  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8", className)}>
      {breadcrumbs && (
        <div className="mb-3 animate-fade-in">{breadcrumbs}</div>
      )}

      {hasHeader && (
        <header
          className={cn(
            "flex flex-col gap-1 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
            "border-b border-border/75",
            headerClassName
          )}
        >
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-foreground animate-slide-up sm:text-3xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-base animate-slide-up" style={{ animationDelay: "50ms" }}>
                {subtitle}
              </p>
            )}
            {headerExtra && (
              <div className="mt-2 animate-slide-up" style={{ animationDelay: "100ms" }}>{headerExtra}</div>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0 animate-slide-up" style={{ animationDelay: "150ms" }}>
              {actions}
            </div>
          )}
        </header>
      )}

      <main className={cn("flex-1", contentPaddingClasses[contentPadding], contentClassName)}>
        {children}
      </main>
    </div>
  );
}

type ContentSectionProps = ComponentPropsWithoutRef<"div"> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  noBorder?: boolean;
};

export function ContentSection({
  title,
  subtitle,
  actions,
  children,
  className,
  noBorder = false,
  ...props
}: ContentSectionProps) {
  return (
    <section
      className={cn(
        "pb-6",
        !noBorder && "border-b border-border/70",
        className
      )}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div>{children}</div>
    </section>
  );
}

type PageFooterProps = ComponentPropsWithoutRef<"div"> & {
  sticky?: boolean;
};

export function PageFooter({
  sticky = false,
  className,
  children,
  ...props
}: PageFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border/75 pt-6",
        sticky && "sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
