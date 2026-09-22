import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   ExamDesk — the quiz/exam surface. No furniture, no chrome:
   only the question at reading measure + answer rows + progress.
   ═══════════════════════════════════════════════════════════════ */

export const ExamDesk = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(function ExamDesk(
  { className, children, ...rest },
  ref
) {
  return (
    <section
      ref={ref}
      aria-label="Exam desk"
      className={cn("mx-auto w-full max-w-[60ch]", className)}
      {...rest}
    >
      {children}
    </section>
  );
});
