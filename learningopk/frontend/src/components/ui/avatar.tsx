import { type HTMLAttributes, type ImgHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Size map ─── */
const avatarSizeVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-subtle",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/** Deterministic gradient from a string. Returns a CSS linear-gradient. */
function initialsGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, var(--accent-primary), var(--accent-info))",
    "linear-gradient(135deg, var(--accent-success), var(--accent-info))",
    "linear-gradient(135deg, var(--accent-warning), var(--accent-danger))",
    "linear-gradient(135deg, var(--accent-primary), var(--accent-danger))",
    "linear-gradient(135deg, var(--accent-info), var(--accent-success))",
    "linear-gradient(135deg, var(--accent-danger), var(--accent-warning))",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length]!;
}

/** Extract up to 2 initials from a name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

/** Props for the Avatar component. */
export interface AvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof avatarSizeVariants> {
  /** Image URL for the avatar. */
  src?: string | null;
  /** Alternative text for the avatar image. */
  alt?: string;
  /** Name used to generate initials and gradient fallback. */
  name?: string;
  /** Show a green online indicator dot. */
  online?: boolean;
}

/**
 * Avatar primitive with image, initials fallback (gradient bg), and online indicator.
 *
 * Sizes: xs (24px) | sm (32px) | md (40px) | lg (48px) | xl (64px).
 */
export function Avatar({
  className,
  size,
  src,
  alt,
  name = "User",
  online,
  ...props
}: AvatarProps) {
  const dotSize =
    size === "xs" || size === "sm"
      ? "h-2 w-2 border"
      : size === "xl"
        ? "h-4 w-4 border-2"
        : "h-3 w-3 border-2";

  return (
    <span
      className={cn(avatarSizeVariants({ size }), className)}
      role="img"
      aria-label={alt ?? name}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-semibold text-accent-primary-fg select-none"
          style={{ background: initialsGradient(name) }}
          aria-hidden="true"
        >
          {getInitials(name)}
        </span>
      )}

      {online ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-bg-surface bg-accent-success",
            "animate-pulse",
            dotSize
          )}
          aria-label="Online"
        />
      ) : null}
    </span>
  );
}

/* ─── Avatar Group ─── */

/** Props for the AvatarGroup component. */
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum number of visible avatars before showing a +N badge. */
  max?: number;
  /** Size passed down to child Avatars. */
  size?: AvatarProps["size"];
}

/**
 * Renders a row of overlapping Avatar components with an optional +N counter.
 *
 * Pass `<Avatar>` elements as children.
 */
export function AvatarGroup({
  className,
  max = 5,
  size = "md",
  children,
  ...props
}: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  const visible = childArray.slice(0, max);
  const overflow = childArray.length - max;

  const overlapClass =
    size === "xs" || size === "sm"
      ? "-ml-2"
      : size === "xl"
        ? "-ml-4"
        : "-ml-3";

  return (
    <div
      className={cn("flex items-center", className)}
      role="group"
      aria-label="Avatar group"
      {...props}
    >
      {visible.map((child, idx) => (
        <span
          key={idx}
          className={cn(
            "ring-2 ring-bg-base rounded-full",
            idx > 0 && overlapClass
          )}
        >
          {child}
        </span>
      ))}

      {overflow > 0 ? (
        <span
          className={cn(
            avatarSizeVariants({ size }),
            overlapClass,
            "ring-2 ring-bg-base bg-bg-elevated text-text-secondary font-semibold select-none"
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
