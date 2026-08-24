"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Brain, GraduationCap, Lock, Mail, Sparkles, TrendingUp } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";

import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const FEATURES = [
  {
    icon: BookOpen,
    title: "Smart Curriculum",
    description: "Pakistani board-aligned content for 9th & 10th",
  },
  {
    icon: Brain,
    title: "AI-Powered Tutoring",
    description: "Get instant help with our AI tutor",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Detailed analytics on your learning journey",
  },
  {
    icon: Sparkles,
    title: "Gamified Learning",
    description: "Earn XP, maintain streaks, and level up",
  },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

export function LoginPageClient() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Please enter a valid email and password."
      );
      return;
    }

    setIsPending(true);
    let result: Awaited<ReturnType<typeof authClient.signIn.email>>;
    try {
      result = await authClient.signIn.email(parsed.data);
    } catch {
      setIsPending(false);
      setErrorMessage(
        "Unable to reach authentication server. Ensure backend is running on port 3001."
      );
      return;
    }
    setIsPending(false);

    if (result.error) {
      const message = result.error.message ?? "Login failed.";
      if (message.toLowerCase().includes("too many requests")) {
        setErrorMessage("Too many login attempts. Please wait a minute and try again.");
      } else {
        setErrorMessage(message);
      }
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const emailError =
    submitted && errorMessage?.toLowerCase().includes("email") ? errorMessage : null;
  const passwordError =
    submitted && errorMessage?.toLowerCase().includes("password") ? errorMessage : null;
  const generalError = errorMessage && !emailError && !passwordError ? errorMessage : null;

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Left decorative panel — lg+ only */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative overflow-hidden">
        <div className="absolute inset-0 bg-bg-surface" />
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-info/5" />
        {/* Geometric decoration */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-info/5 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-display text-xl font-extrabold tracking-tight text-text-primary"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
              priority
            />
            <span>LearningoPK</span>
          </Link>

          {/* Feature highlights */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fadeUp}>
              <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary xl:text-4xl">
                Learn smarter,
                <br />
                <span className="text-accent-primary">not harder.</span>
              </h2>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-md">
                Your personalized learning companion for Pakistani board exams. AI-powered,
                gamified, and built for success.
              </p>
            </motion.div>

            <div className="space-y-4 mt-8">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeUp}
                    className="flex items-start gap-4 rounded-xl border border-border-default/50 bg-bg-base/30 p-4 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10">
                      <Icon className="h-5 w-5 text-accent-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
                      <p className="mt-0.5 text-xs text-text-secondary">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Bottom */}
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} LearningoPK. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold text-text-primary lg:hidden"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
              priority
            />
            <span>LearningoPK</span>
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggleCompact />
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[480px]"
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardBody className="p-8 sm:p-10">
                {/* Heading */}
                <div className="mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 mb-4">
                    <GraduationCap className="h-6 w-6 text-accent-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    Welcome Back
                  </h1>
                  <p className="mt-2 text-sm text-text-secondary">
                    Sign in to continue your learning journey
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <Input
                    id="email"
                    name="email"
                    data-testid="login-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    label="Email"
                    placeholder="name@example.com"
                    prefix={<Mail />}
                    error={emailError}
                    aria-invalid={emailError ? true : undefined}
                  />

                  <PasswordInput
                    name="password"
                    data-testid="login-password-input"
                    label="Password"
                    icon={Lock}
                    iconPosition="left"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    error={passwordError}
                    aria-invalid={passwordError ? true : undefined}
                  />

                  {/* NOTE: Password reset is not implemented in the backend.
                      Better Auth's emailAndPassword config does not include
                      sendResetPassword, so /api/auth/request-password-reset
                      and /api/auth/reset-password endpoints are not registered.
                      See docs/redesign/api-contracts.md.
                      Re-add "Forgot password?" link here once backend
                      sendResetPassword is wired up. */}

                  {generalError ? (
                    <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3 text-sm text-accent-danger">
                      {generalError}
                    </div>
                  ) : null}

                  <Button
                    data-testid="login-submit-button"
                    type="submit"
                    disabled={isPending}
                    loading={isPending}
                    width="full"
                    size="lg"
                  >
                    Sign In
                  </Button>
                </form>

                {/* Divider */}
                <Divider label="or" className="my-6" />

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  width="full"
                  size="lg"
                  iconLeft={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  }
                >
                  Continue with Google
                </Button>

                {/* Register link */}
                <p className="mt-6 text-center text-sm text-text-secondary">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-accent-primary hover:text-accent-primary-hover transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
