import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StandardLayoutProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
};

const maxWidthClasses = {
  default: "max-w-[96rem]",
  wide: "max-w-[120rem]",
  full: "",
};

export function StandardLayout({
  children,
  className,
  maxWidth = "default",
}: StandardLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-6 pb-14 sm:px-6 md:pb-8 lg:px-8",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
