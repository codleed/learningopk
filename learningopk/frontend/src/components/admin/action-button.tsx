import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type AdminActionButtonVariant = "primary" | "secondary" | "danger";

type AdminActionButtonProps = {
  variant: AdminActionButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

const variantMap: Record<AdminActionButtonVariant, ButtonProps["variant"]> = {
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
};

export function AdminActionButton({
  variant,
  loading = false,
  disabled = false,
  children,
  onClick,
  type = "button",
  className,
}: AdminActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Button
      variant={variantMap[variant]}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      aria-busy={loading ? "true" : undefined}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
