import {
  Calculator,
  Atom,
  FlaskConical,
  Leaf,
  BookOpen,
  Languages,
  Landmark,
  Monitor,
  Moon,
  BookOpenText,
  type LucideIcon,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Subject configuration ─── */

interface SubjectConfig {
  /** Brand color for the subject (hex, used as inline style override). */
  color: string;
  /** Lucide icon component for the subject. */
  icon: LucideIcon;
}

const SUBJECT_CONFIG: Record<string, SubjectConfig> = {
  Mathematics: { color: "#6366F1", icon: Calculator },
  Physics: { color: "#06B6D4", icon: Atom },
  Chemistry: { color: "#8B5CF6", icon: FlaskConical },
  Biology: { color: "#22C55E", icon: Leaf },
  English: { color: "#F59E0B", icon: BookOpen },
  Urdu: { color: "#EC4899", icon: Languages },
  "Pakistan Studies": { color: "#14B8A6", icon: Landmark },
  "Computer Science": { color: "#3B82F6", icon: Monitor },
  Islamiat: { color: "#A855F7", icon: Moon },
};

/** Fallback for unknown subjects. */
const DEFAULT_CONFIG: SubjectConfig = {
  color: "#6B7280",
  icon: BookOpenText,
};

/* ─── CVA variants ─── */
const badgeSizeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-[0.6875rem]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const iconSizeMap: Record<NonNullable<SubjectBadgeSize>, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

type SubjectBadgeSize = VariantProps<typeof badgeSizeVariants>["size"];

/** Props for the subject badge component. */
export interface SubjectBadgeProps {
  /** Subject name (must match a key in SUBJECT_CONFIG for branded styling). */
  name: string;
  /** Badge size variant. */
  size?: SubjectBadgeSize;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Branded badge for Pakistani curriculum subjects.
 * Each subject has a consistent color and Lucide icon.
 * Unknown subjects fall back to a neutral gray style.
 */
export function SubjectBadge({ name, size = "md", className }: SubjectBadgeProps) {
  const config = SUBJECT_CONFIG[name] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  const sizeKey = size ?? "md";

  return (
    <span
      className={cn(badgeSizeVariants({ size }), className)}
      style={{
        backgroundColor: `${config.color}1A`,
        color: config.color,
      }}
    >
      <Icon className={iconSizeMap[sizeKey]} aria-hidden="true" />
      <span>{name}</span>
    </span>
  );
}
