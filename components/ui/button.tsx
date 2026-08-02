"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset]",
  accent:
    "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]",
  secondary:
    "bg-[var(--bg-elev-3)] text-[var(--fg)] hover:bg-[#232935] border border-[var(--border)]",
  outline:
    "border border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--bg-elev-2)] hover:border-[var(--fg-subtle)]",
  ghost: "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elev-2)]",
  danger:
    "bg-transparent border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]",
};

const SIZES: Record<Size, string> = {
  // min-h keeps every control at a comfortable pointer/touch target.
  sm: "h-8 min-h-8 px-3 text-[0.8125rem] gap-1.5 rounded-[6px]",
  md: "h-10 min-h-10 px-4 text-sm gap-2 rounded-[8px]",
  lg: "h-12 min-h-12 px-6 text-[0.9375rem] gap-2 rounded-[10px]",
  icon: "h-9 w-9 min-h-9 shrink-0 rounded-[8px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
        "transition-[background-color,border-color,color,transform,opacity] duration-200 ease-[var(--ease-out-expo)]",
        // Scale-only press feedback: never shifts surrounding layout.
        "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
