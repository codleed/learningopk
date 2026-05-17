"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Check,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LinearProgress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const steps = [
  { id: 1, label: "Profile", icon: User },
  { id: 2, label: "Academic", icon: GraduationCap },
  { id: 3, label: "Security", icon: ShieldCheck },
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

const accountSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z
    .string()
    .min(8, "Confirm password must be at least 8 characters."),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions.",
  }),
});

const registerProfileOptionsSchema = z.object({
  boards: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      slug: z.string(),
    })
  ),
  classes: z.array(
    z.object({
      id: z.number().int().positive(),
      boardId: z.number().int().positive(),
      name: z.string(),
      slug: z.string(),
    })
  ),
});

/* Password strength helper */
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: "danger" | "warning" | "success" | "primary";
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "danger" };
  if (score <= 2) return { score: 40, label: "Fair", color: "warning" };
  if (score <= 3) return { score: 60, label: "Good", color: "primary" };
  if (score <= 4) return { score: 80, label: "Strong", color: "success" };
  return { score: 100, label: "Very Strong", color: "success" };
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

export function RegisterPageClient() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profileOptions, setProfileOptions] = useState<z.infer<
    typeof registerProfileOptionsSchema
  > | null>(null);
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
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Profile options request failed: ${response.status}`
          );
        }

        const parsed = registerProfileOptionsSchema.safeParse(
          (await response.json()) as unknown
        );
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
    const selectedBoardId = profileOptions.boards.find(
      (board) => board.slug === formData.board
    )?.id;
    if (!selectedBoardId) return [];
    return profileOptions.classes.filter(
      (option) => option.boardId === selectedBoardId
    );
  }, [profileOptions, formData.board]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

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
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setDirection(-1);
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
      degree: formData.degree.trim() || "Not specified",
    });

    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Registration failed.");
      return;
    }

    router.push("/verify-email");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Left decorative panel — lg+ only */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative overflow-hidden">
        <div className="absolute inset-0 bg-bg-surface" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-success/5" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-accent-success/5 blur-3xl" />

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

          {/* Hero content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary xl:text-4xl">
              Start your
              <br />
              <span className="text-accent-primary">learning journey.</span>
            </h2>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-md">
              Join thousands of Pakistani students preparing for their board
              exams with AI-powered tools, personalized study plans, and
              gamified learning.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { label: "Active Students", value: "10K+" },
                { label: "Subjects Covered", value: "9+" },
                { label: "Quiz Questions", value: "50K+" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border-default/50 bg-bg-base/30 p-4 backdrop-blur-sm"
                >
                  <p className="font-display text-2xl font-bold text-accent-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} LearningoPK. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side — Register form */}
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
        <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[520px]"
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardBody className="p-8 sm:p-10">
                {/* Heading */}
                <div className="mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 mb-4">
                    <GraduationCap className="h-6 w-6 text-accent-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                    Create Account
                  </h1>
                  <p className="mt-2 text-sm text-text-secondary">
                    Join LearningoPK and start your learning journey today
                  </p>
                </div>

                {/* Step indicator */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                      const isCompleted = currentStep > step.id;
                      const isCurrent = currentStep === step.id;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.id}
                          className="flex items-center flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <motion.div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                                isCompleted &&
                                  "border-accent-primary bg-accent-primary text-white",
                                isCurrent &&
                                  "border-accent-primary bg-accent-primary/10 text-accent-primary",
                                !isCompleted &&
                                  !isCurrent &&
                                  "border-border-default bg-bg-subtle text-text-muted"
                              )}
                              animate={
                                isCurrent ? { scale: [1, 1.05, 1] } : {}
                              }
                              transition={{ duration: 0.3 }}
                            >
                              {isCompleted ? (
                                <Check className="h-4 w-4" aria-hidden />
                              ) : (
                                <Icon className="h-4 w-4" aria-hidden />
                              )}
                            </motion.div>
                            <span
                              className={cn(
                                "text-xs font-medium hidden sm:inline",
                                isCurrent && "text-accent-primary",
                                !isCurrent &&
                                  !isCompleted &&
                                  "text-text-muted",
                                isCompleted && "text-text-primary"
                              )}
                            >
                              {step.label}
                            </span>
                          </div>
                          {index < steps.length - 1 && (
                            <div
                              className={cn(
                                "mx-3 flex-1 h-0.5 rounded-full transition-all duration-300",
                                currentStep > step.id
                                  ? "bg-accent-primary"
                                  : "bg-border-default"
                              )}
                              aria-hidden
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-6" noValidate>
                  <AnimatePresence mode="wait" custom={direction}>
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-5"
                      >
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          minLength={2}
                          autoComplete="name"
                          label="Full Name"
                          placeholder="e.g. Ahmed Khan"
                          prefix={<User />}
                          error={errors.name}
                          aria-invalid={!!errors.name}
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                        />

                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          label="Email Address"
                          placeholder="ahmed@example.com"
                          prefix={<Mail />}
                          error={errors.email}
                          aria-invalid={!!errors.email}
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                        />
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div
                        key="step2"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-5"
                      >
                        <div className="w-full space-y-1.5">
                          <label
                            htmlFor="board"
                            className="block text-sm font-medium text-text-primary"
                          >
                            Education Board
                          </label>
                          <div className="relative">
                            <Building2
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted z-10"
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
                              className="pl-10"
                            >
                              <option value="">Select board</option>
                              {(profileOptions?.boards ?? []).map((board) => (
                                <option key={board.id} value={board.slug}>
                                  {board.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          {errors.board ? (
                            <p
                              className="text-xs text-accent-danger"
                              role="alert"
                            >
                              {errors.board}
                            </p>
                          ) : null}
                        </div>

                        <div className="w-full space-y-1.5">
                          <label
                            htmlFor="class"
                            className="block text-sm font-medium text-text-primary"
                          >
                            Class
                          </label>
                          <div className="relative">
                            <GraduationCap
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted z-10"
                            />
                            <Select
                              id="class"
                              name="class"
                              value={formData.class}
                              onChange={(e) =>
                                handleInputChange("class", e.target.value)
                              }
                              required
                              disabled={
                                !formData.board || classOptions.length === 0
                              }
                              aria-invalid={!!errors.class}
                              className="pl-10"
                            >
                              <option value="">Select class</option>
                              {classOptions.map((option) => (
                                <option key={option.id} value={option.slug}>
                                  {option.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          {errors.class ? (
                            <p
                              className="text-xs text-accent-danger"
                              role="alert"
                            >
                              {errors.class}
                            </p>
                          ) : null}
                        </div>

                        <Input
                          id="degree"
                          name="degree"
                          type="text"
                          autoComplete="off"
                          label="Degree (Optional)"
                          placeholder="e.g. B.Sc Computer Science"
                          prefix={<ShieldCheck />}
                          error={errors.degree}
                          aria-invalid={!!errors.degree}
                          value={formData.degree}
                          onChange={(e) =>
                            handleInputChange("degree", e.target.value)
                          }
                        />
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-5"
                      >
                        <div className="space-y-2">
                          <PasswordInput
                            name="password"
                            label="Password"
                            icon={Lock}
                            iconPosition="left"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            error={errors.password}
                            aria-invalid={!!errors.password}
                          />
                          {/* Password strength indicator */}
                          {formData.password.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="space-y-1"
                            >
                              <LinearProgress
                                value={passwordStrength.score}
                                colorVariant={passwordStrength.color}
                                barSize="sm"
                              />
                              <p
                                className={cn(
                                  "text-xs font-medium",
                                  passwordStrength.color === "danger" &&
                                    "text-accent-danger",
                                  passwordStrength.color === "warning" &&
                                    "text-accent-warning",
                                  passwordStrength.color === "primary" &&
                                    "text-accent-primary",
                                  passwordStrength.color === "success" &&
                                    "text-accent-success"
                                )}
                              >
                                {passwordStrength.label}
                              </p>
                            </motion.div>
                          )}
                        </div>

                        <PasswordInput
                          name="confirmPassword"
                          label="Confirm Password"
                          icon={Lock}
                          iconPosition="left"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            handleInputChange(
                              "confirmPassword",
                              e.target.value
                            )
                          }
                          error={errors.confirmPassword}
                          aria-invalid={!!errors.confirmPassword}
                        />

                        <Checkbox
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
                          label="I agree to the Terms of Service and Privacy Policy"
                          hint="By creating an account, you agree to our terms."
                        />
                        {errors.agreedToTerms ? (
                          <p
                            className="text-xs text-accent-danger"
                            role="alert"
                          >
                            {errors.agreedToTerms}
                          </p>
                        ) : null}

                        {errorMessage ? (
                          <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3 text-sm text-accent-danger">
                            {errorMessage}
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {optionsError ? (
                    <p className="text-xs text-accent-danger">{optionsError}</p>
                  ) : null}

                  {/* Navigation buttons */}
                  <div className="flex gap-3 pt-2">
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleBack}
                        className="flex-1"
                        size="lg"
                      >
                        Back
                      </Button>
                    )}
                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="flex-1"
                        size="lg"
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isPending || !!optionsError}
                        loading={isPending}
                        className="flex-1"
                        size="lg"
                      >
                        Create Account
                      </Button>
                    )}
                  </div>
                </form>

                {/* Login link */}
                <p className="mt-6 text-center text-sm text-text-secondary">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-accent-primary hover:text-accent-primary-hover transition-colors"
                  >
                    Sign in
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
