import {
  FileText,
  MessageSquare,
  TextCursorInput,
  Atom,
} from "lucide-react";

import type { ExerciseSectionType } from "./exercise-section-card";

/* ═══════════════════════════════════════════════════════════════
   Shared constants for the exercise tab-based form system.

   Used by:
   - add-exercise-form.tsx  (global add page)
   - edit-exercise-form.tsx (global edit page)
   - chapter-exercise-manager.tsx (inline chapter form)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Maps UI section types to the API exercise type values.
 * "long" → "long", "short" → "short", "blanks" → "fill_in_blanks", "physics" → "numerical"
 */
export const SECTION_TO_API_TYPE: Record<
  ExerciseSectionType,
  "long" | "short" | "fill_in_blanks" | "numerical"
> = {
  long: "long",
  short: "short",
  blanks: "fill_in_blanks",
  physics: "numerical",
};

/**
 * Reverse mapping from API exercise type to UI section type.
 * MCQ (legacy) maps to "long" as the closest equivalent.
 */
export const API_TYPE_TO_SECTION: Record<string, ExerciseSectionType> = {
  long: "long",
  short: "short",
  fill_in_blanks: "blanks",
  numerical: "physics",
  // Legacy MCQ exercises map to long in the new tab system
  mcq: "long",
};

/** Section metadata — icons, titles, and descriptions for each exercise type */
export const SECTION_META: Record<
  ExerciseSectionType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  long: {
    icon: <FileText />,
    title: "Long Questions",
    description: "Detailed answers with full working and explanations",
  },
  short: {
    icon: <MessageSquare />,
    title: "Short Questions",
    description:
      "Brief, focused answers — definitions, formulas, short derivations",
  },
  blanks: {
    icon: <TextCursorInput />,
    title: "Fill in the Blanks",
    description: "Complete the sentence with the correct term or value",
  },
  physics: {
    icon: <Atom />,
    title: "Physics Word Problems",
    description: "Numerical problems with optional interactive visualization",
  },
};

/* ─── Animation variants for panel transitions ─── */

export const panelVariants = {
  initial: { opacity: 0, y: 6, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.995 },
};

export const panelTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};
