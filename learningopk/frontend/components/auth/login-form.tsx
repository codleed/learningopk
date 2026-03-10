"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";

import { BentoAuthField } from "@/components/auth/bento-auth-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const LoginForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please enter a valid email and password.");
      return;
    }

    setIsPending(true);
    let result: Awaited<ReturnType<typeof authClient.signIn.email>>;
    try {
      result = await authClient.signIn.email(parsed.data);
    } catch {
      setIsPending(false);
      setErrorMessage("Unable to reach authentication server. Ensure backend is running on port 3001.");
      return;
    }
    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Login failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const emailError = submitted && errorMessage?.toLowerCase().includes("email") ? errorMessage : null;
  const passwordError = submitted && errorMessage?.toLowerCase().includes("password") ? errorMessage : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <BentoAuthField htmlFor="email" label="Email Address" error={emailError}>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92a0b7]" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={emailError ? true : undefined}
            aria-label="Email"
            placeholder="name@example.com"
            className="h-11 rounded-full border-[#d7e6c8] bg-[#fffdfc] px-10 text-sm text-[#243757] shadow-none placeholder:text-[#97a4ba] focus:border-[#7ac943]/50"
          />
        </div>
      </BentoAuthField>
      <BentoAuthField
        htmlFor="password"
        label="Password"
        action={
          <Link href="/forgot-password" className="text-xs font-medium text-[#7ac943] transition hover:text-[#68b036] sm:text-sm">
            Forgot password?
          </Link>
        }
        error={passwordError}
      >
        <div className="relative">
          <LockKeyhole
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#92a0b7]"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="current-password"
            aria-invalid={passwordError ? true : undefined}
            placeholder="••••••••"
            className="h-11 rounded-full border-[#d7e6c8] bg-[#fffdfc] px-10 pr-10 text-sm text-[#243757] shadow-none placeholder:text-[#97a4ba] focus:border-[#7ac943]/50"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#92a0b7] transition hover:text-[#243757]"
          >
            {showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
          </button>
        </div>
      </BentoAuthField>
      {errorMessage && !emailError && !passwordError ? (
        <p className="rounded-[1.5rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
      <label className="flex items-center gap-2.5 text-sm text-[#314261]">
        <input
          type="checkbox"
          name="rememberMe"
          className="h-3.5 w-3.5 rounded-full border border-[#cfe2bd] accent-[#7ac943]"
        />
        <span>Remember me for 30 days</span>
      </label>
      <Button
        type="submit"
        disabled={isPending}
        width="full"
        className="h-11 rounded-full bg-[#7ac943] text-sm font-bold text-white shadow-[0_14px_24px_-18px_rgba(122,201,67,0.9)] hover:bg-[#68b036]"
      >
        {isPending ? "Logging In..." : "Log In"}
      </Button>
      <p className="pt-1 text-center text-sm text-[#314261]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-bold text-[#7ac943] transition hover:text-[#68b036]">
          Create account
        </Link>
      </p>
    </form>
  );
};
