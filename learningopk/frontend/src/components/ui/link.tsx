import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: NextLinkProps["href"];
  variant?: "default" | "subtle";
  children: ReactNode;
}

export function Link({ className, variant = "default", ...props }: LinkProps) {
  return (
    <NextLink
      className={cn(
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
        variant === "default"
          ? "text-accent-primary underline underline-offset-2 hover:text-accent-primary-hover"
          : "text-text-secondary hover:text-text-primary",
        className
      )}
      {...props}
    />
  );
}
