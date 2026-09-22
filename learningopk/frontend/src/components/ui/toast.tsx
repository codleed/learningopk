"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  durationMs: number;
  createdAt: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClassName: Record<ToastTone, string> = {
  info: "text-ink-soft",
  success: "text-accent-bright",
  warning: "text-ochre",
  error: "text-danger",
};

const toneIcon: Record<ToastTone, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  warning: <TriangleAlert className="h-4 w-4" aria-hidden />,
  error: <CircleAlert className="h-4 w-4" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: ToastInput) => {
    setToasts((current) =>
      [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: toast.title,
          description: toast.description,
          tone: toast.tone ?? "info",
          durationMs: toast.durationMs ?? 4200,
          createdAt: Date.now(),
        },
      ].slice(-3)
    );
  }, []);

  const contextValue = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

type ToastViewProps = {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
};

function ToastView({ toast, onDismiss }: ToastViewProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.durationMs, toast.id]);

  return (
    <div className="pointer-events-auto rounded-[8px] border border-hairline-strong bg-paper-dim p-3 shadow-[var(--shadow-md)] text-ink">
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5", toneClassName[toast.tone])}>{toneIcon[toast.tone]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs text-ink-soft">{toast.description}</p>
          ) : null}
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {new Date(toast.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded p-1 text-current/70 hover:bg-black/5 hover:text-current"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
