"use client";

import { FormEvent, useState } from "react";
import { z } from "zod";

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
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <h2 className="text-base font-semibold text-emerald-900">Check your inbox</h2>
        <p className="mt-1 text-sm text-emerald-800">
          If an account exists for <span className="font-semibold">{email}</span>, reset instructions have been sent.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
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
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label htmlFor="email" className="space-y-1">
        <span className="block text-sm font-medium text-foreground">Email</span>
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
        />
      </label>
      {errorMessage ? <p className="text-xs text-rose-700">{errorMessage}</p> : null}
      <Button type="submit" width="full" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset instructions"}
      </Button>
    </form>
  );
}
