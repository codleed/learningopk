"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";

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
        <Select
          id="class"
          name="class"
          value={selectedClass}
          onChange={(event) => setSelectedClass(event.target.value)}
          required
          disabled={!selectedBoard || classOptions.length === 0}
          aria-invalid={classError ? true : undefined}
        >
          <option value="">Select class</option>
          {classOptions.map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </Select>
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
        >
          <option value="">Select board</option>
          {(profileOptions?.boards ?? []).map((board) => (
            <option key={board.id} value={board.slug}>
              {board.name}
            </option>
          ))}
        </Select>
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
      {optionsError ? <p className="text-xs text-rose-700">{optionsError}</p> : null}
      {errorMessage && !nameError && !classError && !degreeError && !boardError && !emailError && !passwordError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={isPending || !!optionsError} width="full">
        {isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
};
