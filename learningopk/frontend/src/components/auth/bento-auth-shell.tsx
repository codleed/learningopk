import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BentoAuthShellProps = {
  title: string;
  subtitle: string;
  topLink?: {
    href: string;
    label: string;
  };
  badge?: ReactNode;
  children: ReactNode;
  cardClassName?: string;
};

export function BentoAuthShell({
  title,
  subtitle,
  topLink,
  badge,
  children,
  cardClassName,
}: BentoAuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f6f1ef] text-[#0f1a3a]">
      <header className="px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.03em] sm:text-xl"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={40}
              height={40}
              className="h-9 w-9 rounded-full object-cover"
              priority
            />
            <span>LearningoPK</span>
          </Link>
          {topLink ? (
            <Link
              href={topLink.href}
              className="text-xs font-semibold text-[#243757] transition hover:text-[#7ac943] sm:text-sm"
            >
              {topLink.label}
            </Link>
          ) : (
            <span aria-hidden className="w-12" />
          )}
        </div>
        <div className="mt-4 border-t border-[#eedfd8]" />
      </header>

      <div className="px-4 pb-7 pt-5 sm:px-6 sm:pb-10 sm:pt-6">
        <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-[96rem] flex-col items-center justify-center">
          <section
            data-testid="bento-auth-card"
            className={cn(
              "w-full max-w-[36rem] rounded-[1.8rem] border border-[#f1e2da] bg-[#fffdfc] px-4 py-5 sm:px-6 sm:py-7",
              cardClassName,
            )}
          >
            <div className="flex flex-col items-center text-center">
              {badge ? <div className="mb-4">{badge}</div> : null}
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.05em] text-[#0d1736] sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-[26rem] text-sm text-[#72819d] sm:text-base">
                {subtitle}
              </p>
            </div>

            <div className="mt-6 sm:mt-7">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
