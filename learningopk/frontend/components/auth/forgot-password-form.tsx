"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { z } from "zod";

import { FormField } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.")
});

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const toResetErrorMessage = async (response: Response): Promise<string> => {
  let responseMessage: string | null = null;

  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    responseMessage = payload.message ?? payload.error ?? null;
  } catch {
    responseMessage = null;
  }

  if (responseMessage?.includes("Reset password isn't enabled")) {
    return "Reset requests are not enabled on this server yet.";
  }

  if (responseMessage && process.env.NODE_ENV === "development") {
    return responseMessage;
  }

  if (response.status >= 500) {
    return "Password reset service is temporarily unavailable. Try again shortly.";
  }

  return "Unable to request password reset right now.";
};

const requestResetInstructions = async (email: string): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/auth/request-password-reset`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      redirectTo: `${window.location.origin}/reset-password`
    })
  });

  if (!response.ok) {
    throw new Error(await toResetErrorMessage(response));
  }
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please enter a valid email.");
      return;
    }

    setIsPending(true);
    try {
      await requestResetInstructions(parsed.data.email);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to request password reset right now.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-emerald-900">Check your inbox</h2>
        <p className="mt-2 text-sm text-emerald-700">
          If an account exists for <span className="font-semibold">{email}</span>, reset instructions have been sent.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setErrorMessage(null);
            setIsSuccess(false);
          }}
        >
          Send another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormField htmlFor="email" label="Email Address" error={errorMessage}>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            disabled={isPending}
            aria-invalid={errorMessage ? true : undefined}
            placeholder="name@example.com"
            className="h-12 rounded-lg border-slate-200 bg-white px-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#7ac943] focus:ring-2 focus:ring-[#7ac943]/20"
          />
        </div>
      </FormField>
      <Button 
        type="submit" 
        width="full" 
        size="lg"
        disabled={isPending}
        className="h-12 rounded-lg bg-[#7ac943] text-base font-semibold text-white shadow-sm hover:bg-[#68b036]"
      >
        {isPending ? "Sending..." : "Send reset instructions"}
      </Button>
      <div className="flex items-center justify-center">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#7ac943]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
