"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { FormField } from "./form-field";
import { Input, type InputProps } from "@/components/ui/input";

type PasswordInputProps = Omit<InputProps, "type"> & {
  label: string;
  error?: string | null;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  action?: React.ReactNode;
};

export function PasswordInput({
  label,
  error,
  icon: Icon,
  iconPosition = "left",
  action,
  className,
  id,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <FormField
      htmlFor={inputId}
      label={label}
      error={error}
      action={action}
      className={className}
    >
      <div className="relative">
        {Icon && iconPosition === "left" && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
        )}
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          className={Icon ? (iconPosition === "left" ? "pl-10 pr-10" : "pl-10 pr-10") : "pr-10"}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
        >
          {showPassword ? (
            <EyeOff aria-hidden className="h-5 w-5" />
          ) : (
            <Eye aria-hidden className="h-5 w-5" />
          )}
        </button>
      </div>
    </FormField>
  );
}
