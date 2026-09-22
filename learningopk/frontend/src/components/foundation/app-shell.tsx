import type { ReactNode } from "react";

import { isStaffSession } from "@/components/admin/admin-guard";
import { AuthLayoutWrapper } from "@/components/foundation/auth-layout-wrapper";
import { KitabIndexClientBridge } from "@/components/kitab/kitab-index-bridge";
import type { IndexEntry } from "@/components/kitab/kitab-index";
import type { QuietBarLink } from "@/components/kitab/quiet-bar";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

const HUB_LINKS: QuietBarLink[] = [
  { href: "/kitab/today", label: "Today", currentMatch: "/kitab/today" },
  { href: "/kitab/library", label: "Library", currentMatch: "/kitab/library" },
  { href: "/kitab/practice", label: "Practice", currentMatch: "/kitab/practice" },
  { href: "/kitab/community", label: "Community", currentMatch: "/kitab/community" },
  { href: "/kitab/records", label: "Records", currentMatch: "/kitab/records" },
];

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
  contentClassName,
}: AppShellProps) {
  const shellContainerClassName = cn(
    "max-w-[97rem] px-4 pb-14 pt-6 sm:px-6 lg:px-8",
    contentClassName
  );

  const staff = session ? isStaffSession(session) : false;
  const indexEntries: IndexEntry[] = [
    ...HUB_LINKS.map((l) => ({ label: l.label, href: l.href, kind: "hub" as const })),
    { label: "Dashboard", href: "/dashboard", kind: "page" },
    { label: "Forum", href: "/forum", kind: "page" },
    { label: "AI Tutor", href: "/ai-tutor", kind: "page" },
    ...(staff
      ? ([
          { label: "Admin console", href: "/admin", kind: "admin" },
          { label: "School ERP", href: "/school/erp", kind: "admin" },
        ] satisfies IndexEntry[])
      : []),
  ];

  if (session) {
    return (
      <div className={cn("relative min-h-screen bg-transparent", className)}>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--primary-foreground)] focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
        >
          Skip to content
        </a>

        <KitabIndexClientBridge entries={indexEntries} links={HUB_LINKS} />

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
        className="sr-only rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--primary-foreground)] focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>
      <KitabIndexClientBridge entries={indexEntries} links={HUB_LINKS} />
      <main id="main-content" className={cn("mx-auto", shellContainerClassName)}>
        {children}
      </main>
    </div>
  );
}
