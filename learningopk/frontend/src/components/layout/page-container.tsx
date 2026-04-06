import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import type { BreadcrumbItem } from "@/components/common/page-header";

type PageContainerProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: BreadcrumbItem[] | ReactNode;
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

/**
 * Check whether a breadcrumbs prop is a structured BreadcrumbItem array
 * (as expected by the canonical PageHeader) vs. arbitrary ReactNode markup.
 */
function isBreadcrumbItemArray(
  value: BreadcrumbItem[] | ReactNode,
): value is BreadcrumbItem[] {
  return Array.isArray(value) && value.every(
    (v) => typeof v === "object" && v !== null && "label" in v,
  );
}

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

  // Determine if breadcrumbs is a structured array we can forward to PageHeader
  const structuredBreadcrumbs =
    breadcrumbs && isBreadcrumbItemArray(breadcrumbs) ? breadcrumbs : undefined;
  const breadcrumbsNode =
    breadcrumbs && !isBreadcrumbItemArray(breadcrumbs) ? breadcrumbs : undefined;

  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8", className)}>
      {/* Render raw ReactNode breadcrumbs above the header (legacy compat) */}
      {breadcrumbsNode && (
        <div className="mb-3 animate-fade-in">{breadcrumbsNode}</div>
      )}

      {hasHeader && (
        <div className={cn("border-b border-border-default/75 pb-6", headerClassName)}>
          <PageHeader
            title={typeof title === "string" ? title : String(title ?? "")}
            subtitle={typeof subtitle === "string" ? subtitle : subtitle ? String(subtitle) : undefined}
            breadcrumbs={structuredBreadcrumbs}
            actions={actions}
          />
          {headerExtra && (
            <div className="mt-2 animate-slide-up" style={{ animationDelay: "100ms" }}>{headerExtra}</div>
          )}
        </div>
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
        !noBorder && "border-b border-border-default/70",
        className
      )}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-text-primary sm:text-xl">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-text-secondary sm:text-sm">
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
        "flex items-center justify-end gap-3 border-t border-border-default/75 pt-6",
        sticky && "sticky bottom-0 bg-bg-base/95 backdrop-blur-sm pb-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
