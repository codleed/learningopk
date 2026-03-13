"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, ChevronDown, GraduationCap, LockKeyhole, Mail, User } from "lucide-react";
import { z } from "zod";

import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name."),
    class: z.string().trim().min(1, "Please enter your class."),
    degree: z.string().trim().min(1, "Please enter your degree."),
    board: z.string().trim().min(1, "Please enter your board."),
    email: z.string().trim().email("Please enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

const registerProfileOptionsSchema = z.object({
  boards: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      slug: z.string()
    })
  ),
  classes: z.array(
    z.object({
      id: z.number().int().positive(),
      boardId: z.number().int().positive(),
      name: z.string(),
      slug: z.string()
    })
  )
});

export const RegisterForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [profileOptions, setProfileOptions] = useState<z.infer<typeof registerProfileOptionsSchema> | null>(null);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfileOptions = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/forum/filters`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Profile options request failed: ${response.status}`);
        }

        const parsed = registerProfileOptionsSchema.safeParse((await response.json()) as unknown);
        if (!parsed.success) {
          throw new Error("Invalid profile options payload.");
        }

        if (active) {
          setProfileOptions(parsed.data);
          setOptionsError(null);
        }
      } catch {
        if (active) {
          setProfileOptions(null);
          setOptionsError("Unable to load boards and classes. Ensure backend is running on http://localhost:3001.");
        }
      }
    };

    void loadProfileOptions();

    return () => {
      active = false;
    };
  }, []);

  const classOptions = useMemo(() => {
    if (!profileOptions) {
      return [];
    }
    const selectedBoardId = profileOptions.boards.find((board) => board.slug === selectedBoard)?.id;
    if (!selectedBoardId) {
      return [];
    }
    return profileOptions.classes.filter((option) => option.boardId === selectedBoardId);
  }, [profileOptions, selectedBoard]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitted(true);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      class: selectedClass,
      degree: String(formData.get("degree") ?? ""),
      board: selectedBoard,
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid registration input.");
      return;
    }

    setIsPending(true);
    const result = await authClient.signUp.email({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      class: parsed.data.class,
      degree: parsed.data.degree,
      board: parsed.data.board
    });
    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Registration failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const issueText = errorMessage?.toLowerCase() ?? "";
  const nameError = submitted && issueText.includes("name") ? errorMessage : null;
  const classError = submitted && issueText.includes("class") ? errorMessage : null;
  const degreeError = submitted && issueText.includes("degree") ? errorMessage : null;
  const boardError = submitted && issueText.includes("board") ? errorMessage : null;
  const emailError = submitted && issueText.includes("email") ? errorMessage : null;
  const passwordError = submitted && issueText.includes("password") ? errorMessage : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormField htmlFor="name" label="Full Name" error={nameError}>
        <div className="relative">
          <User aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            aria-invalid={nameError ? true : undefined}
            aria-label="Name"
            placeholder="e.g. Alex Johnson"
            className="pl-10"
          />
        </div>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField htmlFor="class" label="Class" error={classError}>
          <div className="relative">
            <GraduationCap
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Select
              id="class"
              name="class"
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              required
              disabled={!selectedBoard || classOptions.length === 0}
              aria-invalid={classError ? true : undefined}
              aria-label="Class"
              className="h-12 appearance-none rounded-lg border border-input bg-card px-10 pr-10 text-base text-foreground focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">Select class</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </Select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </FormField>
        <FormField htmlFor="degree" label="Degree" error={degreeError}>
          <div className="relative">
            <BadgeCheck
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="degree"
              name="degree"
              type="text"
              required
              autoComplete="off"
              aria-invalid={degreeError ? true : undefined}
              placeholder="e.g. B.Sc Computer Science"
              className="pl-10"
            />
          </div>
        </FormField>
      </div>
      <FormField htmlFor="board" label="Education Board" error={boardError}>
        <div className="relative">
          <Building2
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <Select
            id="board"
            name="board"
            value={selectedBoard}
            onChange={(event) => {
              setSelectedBoard(event.target.value);
              setSelectedClass("");
            }}
            required
            aria-invalid={boardError ? true : undefined}
            aria-label="Board"
            className="h-12 appearance-none rounded-lg border border-input bg-card px-10 pr-10 text-base text-foreground focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="">Select board</option>
            {(profileOptions?.boards ?? []).map((board) => (
              <option key={board.id} value={board.slug}>
                {board.name}
              </option>
            ))}
          </Select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </FormField>
      <FormField htmlFor="email" label="Email Address" error={emailError}>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={emailError ? true : undefined}
            aria-label="Email"
            placeholder="alex@example.com"
            className="pl-10"
          />
        </div>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordInput
          name="password"
          label="Password"
          icon={LockKeyhole}
          iconPosition="left"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwordError ? true : undefined}
          placeholder="••••••••"
        />
        <PasswordInput
          name="confirmPassword"
          label="Confirm Password"
          icon={LockKeyhole}
          iconPosition="left"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwordError ? true : undefined}
          placeholder="••••••••"
        />
      </div>
      {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
      {optionsError ? <p className="text-xs text-destructive">{optionsError}</p> : null}
      {errorMessage && !nameError && !classError && !degreeError && !boardError && !emailError && !passwordError ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input text-[var(--primary)] focus:ring-[var(--primary)]/50" />
        <span>
          I agree to the{" "}
          <Link href="/terms-of-service" className="font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Button
        type="submit"
        disabled={isPending || !!optionsError}
        width="full"
        size="lg"
      >
        {isPending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
          Sign in
        </Link>
      </p>
    </form>
  );
};
