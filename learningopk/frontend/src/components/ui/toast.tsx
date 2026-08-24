"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClassName: Record<ToastTone, string> = {
  info: "border-accent-info/30 bg-accent-info-light text-accent-info",
  success: "border-accent-success/30 bg-accent-success-light text-accent-success",
  warning: "border-accent-warning/30 bg-accent-warning-light text-accent-warning",
  error: "border-accent-danger/30 bg-accent-danger-light text-accent-danger"
};

const toneIcon: Record<ToastTone, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  warning: <TriangleAlert className="h-4 w-4" aria-hidden />,
  error: <CircleAlert className="h-4 w-4" aria-hidden />
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: ToastInput) => {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: toast.title,
        description: toast.description,
        tone: toast.tone ?? "info",
        durationMs: toast.durationMs ?? 4200
      }
    ]);
  }, []);

  const contextValue = useMemo(
    () => ({
      pushToast,
      dismissToast
    }),
    [dismissToast, pushToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
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
    <div
      className={cn(
        "pointer-events-auto rounded-xl border p-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm",
        toneClassName[toast.tone]
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5">{toneIcon[toast.tone]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? <p className="mt-1 text-xs opacity-90">{toast.description}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded p-1 text-current/70 hover:bg-current/10 hover:text-current"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

