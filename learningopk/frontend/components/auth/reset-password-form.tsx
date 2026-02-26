"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResetPasswordFormProps = {
  token: string | null;
  initialError: "missing_token" | "invalid_token" | null;
};

const resetPasswordSchema = z
  .object({
    newPassword: z.string().trim().min(1, "Please enter a new password."),
    confirmPassword: z.string().trim().min(1, "Please confirm your new password.")
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match."
      });
    }
  });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const mapResetPasswordErrorMessage = async (response: Response): Promise<string> => {
  let responseMessage: string | null = null;

  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    responseMessage = payload.message ?? payload.error ?? null;
  } catch {
    responseMessage = null;
  }

  if (responseMessage?.includes("INVALID_TOKEN")) {
    return "Reset link is invalid or expired. Request a new password reset link.";
  }

  if (responseMessage?.includes("PASSWORD_TOO_SHORT")) {
    return "Password must be at least 8 characters.";
  }

  if (responseMessage?.includes("PASSWORD_TOO_LONG")) {
    return "Password is too long. Use a shorter password and try again.";
  }

  if (response.status >= 500) {
    return "Password reset service is temporarily unavailable. Try again shortly.";
  }

  return "Unable to reset password right now.";
};

const submitPasswordReset = async (token: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      token,
      newPassword
    })
  });

  if (!response.ok) {
    throw new Error(await mapResetPasswordErrorMessage(response));
  }
};

const initialErrorMessageByType: Record<Exclude<ResetPasswordFormProps["initialError"], null>, string> = {
  missing_token: "Reset token is missing. Request a new reset link from forgot password.",
  invalid_token: "Reset link is invalid or expired. Request a new password reset link."
};

export function ResetPasswordForm({ token, initialError }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? initialErrorMessageByType[initialError] : null
  );
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage(initialErrorMessageByType.missing_token);
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Enter a valid new password.");
      return;
    }

    setIsPending(true);
    try {
      await submitPasswordReset(token, parsed.data.newPassword);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reset password right now.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <h2 className="text-base font-semibold text-emerald-900">Password reset complete</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Your password has been updated. Continue to login with your new credentials.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-accent/50"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label htmlFor="new-password" className="space-y-1">
        <span className="block text-sm font-medium text-foreground">New password</span>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          autoComplete="new-password"
          disabled={isPending || !token}
          aria-invalid={errorMessage ? true : undefined}
        />
      </label>
      <label htmlFor="confirm-password" className="space-y-1">
        <span className="block text-sm font-medium text-foreground">Confirm password</span>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
          disabled={isPending || !token}
          aria-invalid={errorMessage ? true : undefined}
        />
      </label>
      {errorMessage ? <p className="text-xs text-rose-700">{errorMessage}</p> : null}
      <Button type="submit" width="full" disabled={isPending || !token}>
        {isPending ? "Resetting..." : "Reset password"}
      </Button>
      {!token ? (
        <p className="text-xs text-muted-foreground">
          Need a new link?{" "}
          <Link href="/forgot-password" className="font-semibold text-foreground underline underline-offset-4">
            Request password reset
          </Link>
        </p>
      ) : null}
    </form>
  );
}
