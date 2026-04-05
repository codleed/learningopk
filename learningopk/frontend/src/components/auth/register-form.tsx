"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Check, GraduationCap, LockKeyhole, Mail, ShieldCheck, User } from "lucide-react";
import { z } from "zod";

import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const steps = [
  { id: 1, label: "Profile", icon: User },
  { id: 2, label: "Academic", icon: GraduationCap },
  { id: 3, label: "Account", icon: ShieldCheck },
] as const;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
});

const academicSchema = z.object({
  board: z.string().trim().min(1, "Please select your board."),
  class: z.string().trim().min(1, "Please select your class."),
  degree: z.string().optional(),
});

const accountSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters."),
    agreedToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions.",
    }),
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profileOptions, setProfileOptions] = useState<z.infer<typeof registerProfileOptionsSchema> | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    board: "",
    class: "",
    degree: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    const loadProfileOptions = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/learn/boards`, {
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
          setOptionsError("Unable to load options. Please refresh the page.");
        }
      }
    };

    void loadProfileOptions();

    return () => {
      active = false;
    };
  }, []);

  const classOptions = useMemo(() => {
    if (!profileOptions) return [];
    const selectedBoardId = profileOptions.boards.find((board) => board.slug === formData.board)?.id;
    if (!selectedBoardId) return [];
    return profileOptions.classes.filter((option) => option.boardId === selectedBoardId);
  }, [profileOptions, formData.board]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const parsed = profileSchema.safeParse({
        name: formData.name,
        email: formData.email,
      });
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          newErrors[issue.path[0] as string] = issue.message;
        });
      }
    }

    if (step === 2) {
      const parsed = academicSchema.safeParse({
        board: formData.board,
        class: formData.class,
        degree: formData.degree,
      });
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          newErrors[issue.path[0] as string] = issue.message;
        });
      }
    }

    if (step === 3) {
      const parsed = accountSchema.safeParse({
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        agreedToTerms,
      });
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          newErrors[issue.path[0] as string] = issue.message;
        });
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateStep(3)) {
      return;
    }

    setErrorMessage(null);
    setIsPending(true);

    const result = await authClient.signUp.email({
      email: formData.email,
      name: formData.name,
      password: formData.password,
      class: formData.class,
      board: formData.board,
      degree: formData.degree.trim() || "Not specified"
    });

    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Registration failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted && "border-[var(--primary)] bg-[var(--primary)] text-primary-foreground",
                  isCurrent && "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]",
                  !isCompleted && !isCurrent && "border-border bg-muted/50 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" aria-hidden />
                ) : (
                  <Icon className="h-5 w-5" aria-hidden />
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden sm:inline",
                  isCurrent && "text-[var(--primary)]",
                  !isCurrent && !isCompleted && "text-muted-foreground",
                  isCompleted && "text-foreground"
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 transition-all duration-300",
                    currentStep > step.id ? "bg-[var(--primary)]" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Create your profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Let&apos;s start with your basic information</p>
      </div>

      <FormField htmlFor="name" label="Full Name" error={errors.name}>
        <div className="relative">
          <User aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-label="Name"
            placeholder="e.g. Alex Johnson"
            className="pl-10"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />
        </div>
      </FormField>

      <FormField htmlFor="email" label="Email Address" error={errors.email}>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-label="Email"
            placeholder="alex@example.com"
            className="pl-10"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
          />
        </div>
      </FormField>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Academic Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tell us about your education</p>
      </div>

      <FormField htmlFor="board" label="Education Board" error={errors.board}>
        <div className="relative">
          <Building2
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <Select
            id="board"
            name="board"
            value={formData.board}
            onChange={(e) => {
              handleInputChange("board", e.target.value);
              handleInputChange("class", "");
            }}
            required
            aria-invalid={!!errors.board}
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
        </div>
      </FormField>

      <FormField htmlFor="class" label="Class" error={errors.class}>
        <div className="relative">
          <GraduationCap
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <Select
            id="class"
            name="class"
            value={formData.class}
            onChange={(e) => handleInputChange("class", e.target.value)}
            required
            disabled={!formData.board || classOptions.length === 0}
            aria-invalid={!!errors.class}
            aria-label="Class"
            className="h-12 appearance-none rounded-lg border border-input bg-card px-10 pr-10 text-base text-foreground focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select class</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
      </FormField>

      <FormField htmlFor="degree" label="Degree (Optional)" error={errors.degree}>
        <div className="relative">
          <ShieldCheck
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="degree"
            name="degree"
            type="text"
            autoComplete="off"
            aria-invalid={!!errors.degree}
            placeholder="e.g. B.Sc Computer Science"
            className="pl-10"
            value={formData.degree}
            onChange={(e) => handleInputChange("degree", e.target.value)}
          />
        </div>
      </FormField>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Secure your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a strong password</p>
      </div>

      <PasswordInput
        name="password"
        label="Password"
        icon={LockKeyhole}
        iconPosition="left"
        required
        minLength={8}
        autoComplete="new-password"
        aria-invalid={!!errors.password}
        placeholder="At least 8 characters"
        value={formData.password}
        onChange={(e) => handleInputChange("password", e.target.value)}
      />

      <PasswordInput
        name="confirmPassword"
        label="Confirm Password"
        icon={LockKeyhole}
        iconPosition="left"
        required
        minLength={8}
        autoComplete="new-password"
        aria-invalid={!!errors.confirmPassword}
        placeholder="Re-enter your password"
        value={formData.confirmPassword}
        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
        error={errors.confirmPassword}
      />

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => {
            setAgreedToTerms(e.target.checked);
            if (e.target.checked && errors.agreedToTerms) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.agreedToTerms;
                return next;
              });
            }
          }}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border-input text-[var(--primary)] focus:ring-[var(--primary)]/50",
            errors.agreedToTerms && "border-destructive"
          )}
        />
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
      {errors.agreedToTerms && (
        <p className="text-sm text-destructive">{errors.agreedToTerms}</p>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {renderStepIndicator()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {optionsError && (
        <p className="text-xs text-destructive">{optionsError}</p>
      )}

      <div className="flex gap-3 pt-2">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            className="flex-1"
          >
            Back
          </Button>
        )}
        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isPending || !!optionsError}
            className="flex-1"
          >
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        )}
      </div>

      {currentStep === 1 && (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
};
