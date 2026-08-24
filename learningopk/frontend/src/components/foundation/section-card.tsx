import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <section className={cn("border-b border-border-default/70 pb-6", className)}>
      {title || description || actions ? (
        <header className="flex flex-col gap-3 border-b border-border-default/75 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("pt-4", contentClassName)}>{children}</div>
    </section>
  );
}
