import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Board configuration ─── */

interface BoardConfig {
  /** Brand color for the board (hex, used as inline style override). */
  color: string;
  /** Human-readable label. */
  label: string;
}

const BOARD_CONFIG: Record<string, BoardConfig> = {
  federal: { color: "#6366F1", label: "Federal" },
  punjab:  { color: "#22C55E", label: "Punjab" },
  sindh:   { color: "#F59E0B", label: "Sindh" },
};

/** Fallback for unrecognized board keys. */
const DEFAULT_BOARD: BoardConfig = {
  color: "#6B7280",
  label: "Unknown",
};

/* ─── CVA variants ─── */
const badgeSizeVariants = cva(
  "inline-flex items-center rounded-full font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-[0.625rem]",
        md: "px-2.5 py-0.5 text-[0.6875rem]",
        lg: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type BoardBadgeSize = VariantProps<typeof badgeSizeVariants>["size"];

/** Props for the board badge component. */
export interface BoardBadgeProps {
  /** Board key (e.g. "federal", "punjab", "sindh"). */
  board: string;
  /** Badge size variant. */
  size?: BoardBadgeSize;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Branded badge for Pakistani education boards.
 * Each board has a consistent color and human-readable label.
 */
export function BoardBadge({
  board,
  size = "md",
  className,
}: BoardBadgeProps) {
  const config = BOARD_CONFIG[board.toLowerCase()] ?? {
    ...DEFAULT_BOARD,
    label: board,
  };

  return (
    <span
      className={cn(badgeSizeVariants({ size }), className)}
      style={{
        backgroundColor: `${config.color}1A`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
