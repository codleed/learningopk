"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
  maxVisible?: number;
  separator?: React.ReactNode;
  truncatePosition?: "start" | "middle" | "end";
};

const defaultSeparator = (
  <ChevronRight
    className="h-4 w-4 shrink-0 text-muted-foreground/60"
    aria-hidden="true"
  />
);

export function Breadcrumbs({
  items,
  className,
  showHomeIcon = false,
  maxVisible = 5,
  separator = defaultSeparator,
  truncatePosition = "end",
}: BreadcrumbsProps) {
  const processedItems = useMemo(() => {
    const result = [...items];

    if (showHomeIcon && result[0]?.href !== "/dashboard") {
      result.unshift({
        label: "Home",
        href: "/dashboard",
        icon: <Home className="h-4 w-4" aria-hidden="true" />,
      });
    }

    return result;
  }, [items, showHomeIcon]);

  const needsTruncation = processedItems.length > maxVisible;

  const visibleItems = useMemo(() => {
    if (!needsTruncation) return processedItems;

    const ellipsisItem: BreadcrumbItem = {
      label: "...",
      className: "text-muted-foreground cursor-default",
    };

    switch (truncatePosition) {
      case "start":
        return [
          processedItems[0],
          ellipsisItem,
          ...processedItems.slice(-(maxVisible - 1)),
        ];
      case "middle":
        const start = Math.floor(maxVisible / 2);
        const end = processedItems.length - Math.ceil(maxVisible / 2) + 1;
        return [
          ...processedItems.slice(0, start),
          ellipsisItem,
          ...processedItems.slice(end),
        ];
      case "end":
      default:
        return [
          ...processedItems.slice(0, maxVisible - 1),
          ellipsisItem,
          processedItems[processedItems.length - 1],
        ];
    }
  }, [processedItems, needsTruncation, maxVisible, truncatePosition]);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("w-full", className)}
    >
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isCurrentPage = !item.href || isLast;
          const isEllipsis = item.label === "...";

          const itemContent = (
            <>
              {item.icon && (
                <span className="mr-1 inline-flex items-center">
                  {item.icon}
                </span>
              )}
              <span
                className={cn(
                  "truncate transition-colors duration-200",
                  item.className,
                  !isEllipsis && [
                    "max-w-[150px] sm:max-w-[200px]",
                    isCurrentPage
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ]
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </>
          );

          if (isEllipsis || isCurrentPage) {
            return (
              <li
                key={`breadcrumb-${index}`}
                className="flex items-center"
                aria-current={isCurrentPage && !isEllipsis ? "page" : undefined}
              >
                {index > 0 && (
                  <span className="mx-1 flex items-center" aria-hidden="true">
                    {separator}
                  </span>
                )}
                {itemContent}
              </li>
            );
          }

          return (
            <li key={`breadcrumb-${item.href ?? index}`} className="flex items-center">
              {index > 0 && (
                <span className="mx-1 flex items-center" aria-hidden="true">
                  {separator}
                </span>
              )}
              <Link
                href={item.href!}
                className={cn(
                  "flex items-center rounded transition-colors duration-200",
                  "hover:text-foreground hover:underline underline-offset-2",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {itemContent}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type BreadcrumbsCompactProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function BreadcrumbsCompact({
  items,
  className,
}: BreadcrumbsCompactProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !!item.href && !isLast;

        const content = (
          <span
            className={cn(
              "truncate max-w-[100px]",
              isClickable && "hover:text-foreground cursor-pointer",
              isLast && "font-medium text-foreground"
            )}
            title={item.label}
          >
            {item.icon && <span className="mr-1 inline">{item.icon}</span>}
            {item.label}
          </span>
        );

        return (
          <span key={`compact-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-1 h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            {isClickable ? (
              <Link href={item.href!} className="flex items-center transition-colors">
                {content}
              </Link>
            ) : (
              content
            )}
          </span>
        );
      })}
    </nav>
  );
}
