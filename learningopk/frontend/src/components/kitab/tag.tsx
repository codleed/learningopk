import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Tag — a printed label. Caps, tracked, hairline box. NEVER a
   colored pill with a dot (banned vocabulary).
   ═══════════════════════════════════════════════════════════════ */

export type TagTone = "neutral" | "brick" | "moss" | "ochre" | "plum";

const tagTones: Record<TagTone, string> = {
  neutral: "bg-paper-dim text-ink-soft",
  brick: "bg-accent-tint text-accent-bright",
  moss: "bg-moss-tint text-moss",
  ochre: "bg-ochre-tint text-ochre",
  plum: "bg-plum-tint text-plum",
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { tone = "neutral", className, ...rest },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-[6px] px-2 py-0.5",
        "font-mono text-[10px] font-medium uppercase tracking-[0.06em]",
        "whitespace-nowrap",
        tagTones[tone],
        className
      )}
      {...rest}
    />
  );
});
