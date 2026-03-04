import type { ReactNode } from "react";

import { LeftRail } from "@/components/foundation/left-rail";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  session?: SessionPayload | null;
  currentPath?: string;
  className?: string;
  contentClassName?: string;
};

export function AppShell({
  children,
  session = null,
  currentPath,
  className,
  contentClassName
}: AppShellProps) {
  const shellContainerClassName = cn("mx-auto w-full max-w-[97rem] px-4 pb-14 pt-6 sm:px-6 lg:px-8", contentClassName);

  if (session) {
    return (
      <div className={cn("relative min-h-screen bg-transparent", className)}>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>

        <div className={shellContainerClassName}>
          <div className="flex min-w-0 flex-col gap-4 xl:gap-5 lg:flex-row lg:items-start">
            <LeftRail session={session} currentPath={currentPath} />
            <main id="main-content" className="min-w-0 flex-1">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-screen", className)}>
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>
      <main id="main-content" className={shellContainerClassName}>
        {children}
      </main>
    </div>
  );
}
