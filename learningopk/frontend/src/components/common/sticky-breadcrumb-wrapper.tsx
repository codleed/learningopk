import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyBreadcrumbWrapperProps = {
  children: ReactNode;
  /**
   * Additional classes for the wrapper – typically negative-margin / padding
   * pairs when the sticky bar needs to bleed into the parent's horizontal
   * padding (e.g. `-mx-4 px-4`).
   */
  className?: string;
};

/**
 * Wraps breadcrumb navigation with a sticky glassmorphism bar that pins to
 * the top of the scroll area on scroll.
 *
 * By default the bar only covers its own width. Pass negative-margin +
 * padding utility pairs via `className` to make it bleed edge-to-edge within
 * a padded parent (see the chapter page for an example).
 */
export function StickyBreadcrumbWrapper({
  children,
  className,
}: StickyBreadcrumbWrapperProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20",
        "pb-2 pt-3",
        "backdrop-blur-xl bg-bg-base/70",
        "border-b border-border-default/50",
        className,
      )}
    >
      {children}
    </div>
  );
}
