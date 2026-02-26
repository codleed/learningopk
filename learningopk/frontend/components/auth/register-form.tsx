"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

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

export const RegisterForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitted(true);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      class: String(formData.get("class") ?? ""),
      degree: String(formData.get("degree") ?? ""),
      board: String(formData.get("board") ?? ""),
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
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          aria-invalid={nameError ? true : undefined}
        />
        {nameError ? <p className="text-xs text-rose-700">{nameError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="class" className="block text-sm font-medium text-foreground">
          Class
        </label>
        <Input
          id="class"
          name="class"
          type="text"
          required
          autoComplete="off"
          aria-invalid={classError ? true : undefined}
          placeholder="10th"
        />
        {classError ? <p className="text-xs text-rose-700">{classError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="degree" className="block text-sm font-medium text-foreground">
          Degree
        </label>
        <Input
          id="degree"
          name="degree"
          type="text"
          required
          autoComplete="off"
          aria-invalid={degreeError ? true : undefined}
          placeholder="Matriculation"
        />
        {degreeError ? <p className="text-xs text-rose-700">{degreeError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="board" className="block text-sm font-medium text-foreground">
          Board
        </label>
        <Input
          id="board"
          name="board"
          type="text"
          required
          autoComplete="off"
          aria-invalid={boardError ? true : undefined}
          placeholder="Balochistan"
        />
        {boardError ? <p className="text-xs text-rose-700">{boardError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
        />
        {emailError ? <p className="text-xs text-rose-700">{emailError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwordError ? true : undefined}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={passwordError ? true : undefined}
        />
      </div>
      {passwordError ? <p className="text-xs text-rose-700">{passwordError}</p> : null}
      {errorMessage && !nameError && !classError && !degreeError && !boardError && !emailError && !passwordError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={isPending} width="full">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
};
