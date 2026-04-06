'use client';

import { Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type CrisisBannerProps = {
  onDismiss: () => void;
  className?: string;
};

/**
 * A compassionate, non-alarming banner that surfaces Pakistani crisis resources
 * when a student's message triggers the safety-keyword detector.
 *
 * Uses warm amber/yellow tones — NOT red — to avoid a scary, clinical feel.
 * The banner is rendered at the top of the message area and stays visible until
 * the student dismisses it or the session ends.
 */
export function CrisisBanner({ onDismiss, className }: CrisisBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative mx-4 mt-4 mb-2 rounded-2xl',
        'border border-border-default/70 bg-amber-50/80 dark:border-border-default/70 dark:bg-amber-500/10',
        'px-5 py-4',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        'shadow-sm',
        className,
      )}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={cn(
          'absolute right-3 top-3',
          'flex h-7 w-7 items-center justify-center rounded-full',
          'text-amber-700/60 hover:text-amber-800 hover:bg-amber-200/40',
          'dark:text-amber-300/60 dark:hover:text-amber-200 dark:hover:bg-amber-500/20',
          'transition-colors duration-150',
        )}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2.5 pr-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/60 dark:bg-amber-500/20">
          <Heart className="h-[18px] w-[18px] text-amber-700 dark:text-amber-300" aria-hidden="true" />
        </div>
        <p className="text-[13px] font-semibold leading-snug text-amber-800 dark:text-amber-200">
          You&rsquo;re not alone &mdash; help is available
        </p>
      </div>

      {/* Bilingual message */}
      <div className="mt-3 space-y-1 pl-[46px]">
        <p className="text-[13px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          If you&rsquo;re going through a tough time, you&rsquo;re not alone. Reach out to someone who can help.
        </p>
        <p
          className="text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-100/80"
          dir="rtl"
          lang="ur"
        >
          اگر آپ مشکل وقت سے گزر رہے ہیں، تو آپ اکیلے نہیں ہیں۔ مدد کے لیے رابطہ کریں۔
        </p>
      </div>

      {/* Helplines */}
      <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 pl-[46px]">
        <a
          href="tel:03117786264"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-800 underline underline-offset-2 decoration-amber-400/60 hover:decoration-amber-500 dark:text-amber-200 dark:decoration-amber-400/40 dark:hover:decoration-amber-300 transition-colors"
        >
          <span aria-hidden="true">📞</span>
          Umang Helpline: 0311-7786264
        </a>
        <a
          href="tel:115"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-800 underline underline-offset-2 decoration-amber-400/60 hover:decoration-amber-500 dark:text-amber-200 dark:decoration-amber-400/40 dark:hover:decoration-amber-300 transition-colors"
        >
          <span aria-hidden="true">🚑</span>
          Emergency services: 115 (Rescue 1122 in Punjab)
        </a>
      </div>
    </div>
  );
}
