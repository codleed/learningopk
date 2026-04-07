import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";

/** Single breadcrumb entry — the last item (without href) is the current page. */
export interface BreadcrumbItem {
  /** Display text for the breadcrumb link. */
  label: string;
  /** URL path. Omit for the final / current breadcrumb. */
  href?: string;
}

/** Props for the page header component. */
export interface PageHeaderProps {
  /** Page title rendered in the display font (Syne). */
  title: string;
  /** Optional subtitle shown below the title. */
  subtitle?: string;
  /** Breadcrumb navigation trail above the title. */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons / controls rendered to the right of the title. */
  actions?: React.ReactNode;
  /** Optional badge displayed inline after the title. */
  badge?: React.ReactNode;
  /**
   * When true, the entire header pins to the top with a glassmorphism effect.
   * @default false
   */
  sticky?: boolean;
  /**
   * Extra classes forwarded to the sticky wrapper — typically negative-margin /
   * padding pairs to bleed the bar edge-to-edge within the parent content area.
   * Only relevant when `sticky` is true.
   */
  stickyClassName?: string;
}

/**
 * Consistent page header with optional breadcrumbs, subtitle, badge, and action slot.
 * Headings use the Syne display font (`font-display`).
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  sticky = false,
  stickyClassName,
}: PageHeaderProps) {
  const content = (
    <header className="space-y-1">
      {/* ── Breadcrumbs ── */}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className={cn(!sticky && "mb-2")}>
          <ol className="flex items-center gap-1 text-sm text-text-secondary">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li key={crumb.label} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-text-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        isLast ? "text-text-primary font-medium" : "",
                      )}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}

                  {!isLast ? (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-text-muted"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      {/* ── Title row ── */}
      {(title || actions || badge) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                {title}
              </h1>
              {badge ?? null}
            </div>

            {subtitle ? (
              <p className="text-sm text-text-secondary leading-relaxed sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          {/* ── Actions slot ── */}
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
    </header>
  );

  if (sticky) {
    return (
      <StickyBreadcrumbWrapper className={stickyClassName}>
        {content}
      </StickyBreadcrumbWrapper>
    );
  }

  return content;
}
