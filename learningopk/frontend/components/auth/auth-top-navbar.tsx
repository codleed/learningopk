import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthTopNavbarPath = "/login" | "/register";

type AuthTopNavbarProps = {
  currentPath: AuthTopNavbarPath;
  className?: string;
};

const authNavLinks: Array<{ href: AuthTopNavbarPath; label: string }> = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" }
];

export function AuthTopNavbar({ currentPath, className }: AuthTopNavbarProps) {
  return (
    <nav
      aria-label="Auth navigation"
      className={cn(
        "sticky top-4 z-30 rounded-2xl border border-border bg-background/85 px-3 py-3 shadow-[var(--elevation-card)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.04em] text-foreground sm:text-base"
        >
          <Image
            src="/new_logo.png"
            alt="LearningoPK logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover"
            priority
          />
          <span>LearningoPK</span>
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
          {authNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                currentPath === link.href
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
