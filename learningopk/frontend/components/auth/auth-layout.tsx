"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { HeroIllustration } from "./hero-illustration";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  showHero?: boolean;
  topLink?: {
    href: string;
    label: string;
  };
};

export function AuthLayout({
  children,
  title,
  subtitle,
  showHero = true,
  topLink,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-heading text-xl font-extrabold tracking-tight text-foreground"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
              priority
            />
            <span>LearningoPK</span>
          </Link>
          {topLink ? (
            <Link
              href={topLink.href}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              {topLink.label}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex">
        {/* Hero Illustration Panel - Desktop */}
        {showHero && (
          <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative bg-gradient-to-br from-secondary to-secondary/50">
            <HeroIllustration />
          </div>
        )}

        {/* Form Panel */}
        <div className={`flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 ${showHero ? '' : 'lg:w-full'}`}>
          <div className="w-full max-w-[440px]">
            {/* Mobile Hero (when hero hidden) */}
            {showHero && (
              <div className="lg:hidden mb-8">
                <HeroIllustration />
              </div>
            )}

            {/* Auth Card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
              <div className="text-center mb-8">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                  {subtitle}
                </p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
