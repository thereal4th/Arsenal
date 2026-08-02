"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(
  () => {},
);

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const TONES: Record<ToastTone, string> = {
  success: "border-[color-mix(in_srgb,var(--success)_40%,transparent)] text-[var(--success)]",
  error: "border-[color-mix(in_srgb,var(--danger)_45%,transparent)] text-[var(--danger)]",
  info: "border-[var(--border-strong)] text-[var(--accent)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            // Polite so toasts never interrupt what the user is doing.
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
          >
            {toasts.map((toast) => {
              const Icon = ICONS[toast.tone];
              return (
                <div
                  key={toast.id}
                  className={cn(
                    "pointer-events-auto flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3",
                    "glass animate-fade-up shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)]",
                    TONES[toast.tone],
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p className="flex-1 text-[0.8125rem] leading-snug text-[var(--fg)]">
                    {toast.message}
                  </p>
                  <button
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                    className="-m-1 rounded p-1 text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
