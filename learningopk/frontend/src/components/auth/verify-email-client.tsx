"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Mail, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmailClient() {
  const router = useRouter();
  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = sessionData?.user?.email ?? "";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const newOtp = [...otp];
      newOtp[index] = value.slice(-1);
      setOtp(newOtp);
      setError(null);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = [...Array(OTP_LENGTH).fill("")];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]!;
    }
    setOtp(newOtp);
    setError(null);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const otpString = otp.join("");

  const handleVerify = async () => {
    if (otpString.length !== OTP_LENGTH) return;

    setError(null);
    setIsVerifying(true);

    const result = await authClient.emailOtp.verifyEmail({
      email,
      otp: otpString,
    });

    setIsVerifying(false);

    if (result.error) {
      setError(result.error.message ?? "Verification failed. Please try again.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    setIsResending(true);

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });

    setIsResending(false);

    if (result.error) {
      setError(result.error.message ?? "Failed to resend code. Please try again.");
      return;
    }

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(""));
    inputRefs.current[0]?.focus();
  };

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Left decorative panel — lg+ only */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative overflow-hidden">
        <div className="absolute inset-0 bg-bg-surface" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-success/5" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-accent-success/5 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
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

          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary xl:text-4xl">
              Verify your
              <br />
              <span className="text-accent-primary">email address.</span>
            </h2>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-md">
              We sent a 6-digit code to your email. Enter it below to verify
              your account and unlock all features.
            </p>
          </div>

          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} LearningoPK. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side — Verification form */}
      <div className="flex flex-1 flex-col">
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

        <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-[440px]">
            <Card variant="elevated" className="overflow-hidden">
              <CardBody className="p-8 sm:p-10">
                <div className="mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-success/10 mb-4">
                    <Mail className="h-6 w-6 text-accent-success" />
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    Check your email
                  </h1>
                  <p className="mt-2 text-sm text-text-secondary">
                    We&apos;ve sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-text-primary">
                      {email}
                    </span>
                  </p>
                </div>

                {success ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10">
                      <CheckCircle className="h-8 w-8 text-accent-success" />
                    </div>
                    <p className="font-display text-lg font-semibold text-text-primary">
                      Email verified!
                    </p>
                    <p className="text-sm text-text-secondary">
                      Redirecting to your dashboard...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* OTP Input */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleInputChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          autoFocus={index === 0}
                          className={cn(
                            "h-14 w-12 rounded-xl border-2 bg-bg-base text-center font-display text-2xl font-bold text-text-primary outline-none transition-all duration-200",
                            "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
                            error
                              ? "border-accent-danger"
                              : digit
                                ? "border-accent-primary"
                                : "border-border-default hover:border-border-strong"
                          )}
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>

                    {error ? (
                      <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3 text-sm text-accent-danger mb-6">
                        {error}
                      </div>
                    ) : null}

                    {/* Verify Button */}
                    <Button
                      variant="primary"
                      width="full"
                      size="lg"
                      disabled={otpString.length !== OTP_LENGTH}
                      loading={isVerifying}
                      onClick={handleVerify}
                    >
                      Verify Email
                    </Button>

                    {/* Resend + Skip */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || isResending}
                        onClick={handleResend}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                          resendCooldown > 0
                            ? "text-text-muted cursor-not-allowed"
                            : "text-accent-primary hover:text-accent-primary-hover"
                        )}
                      >
                        <RefreshCw
                          className={cn("h-3.5 w-3.5", isResending && "animate-spin")}
                        />
                        {resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : "Resend code"}
                      </button>

                      <Link
                        href="/dashboard"
                        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Skip for now
                      </Link>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
