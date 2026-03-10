import type { ReactNode } from "react";

import { AuthLayoutWrapper } from "@/components/foundation/auth-layout-wrapper";
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
  const shellContainerClassName = cn("w-full max-w-[97rem] px-4 pb-14 pt-6 sm:px-6 lg:px-8", contentClassName);

  if (session) {
    return (
      <div className={cn("relative min-h-screen bg-transparent", className)}>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>

        <AuthLayoutWrapper
          session={session}
          currentPath={currentPath}
          className={shellContainerClassName}
        >
          {children}
        </AuthLayoutWrapper>
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
      <main id="main-content" className={cn("mx-auto", shellContainerClassName)}>
        {children}
      </main>
    </div>
  );
}
