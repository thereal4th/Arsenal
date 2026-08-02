import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-elev-1)] border border-[var(--border)] rounded-[12px] edge-light",
        interactive &&
          "transition-[border-color,background-color] duration-200 ease-[var(--ease-out-expo)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev-2)]",
        className,
      )}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-elev-1)] border border-[var(--border)] rounded-[10px]",
        className,
      )}
      {...props}
    />
  );
}

const TONES = {
  neutral: "bg-[var(--bg-elev-3)] text-[var(--fg-muted)] border-[var(--border)]",
  primary:
    "bg-[var(--primary-soft)] text-[#ff8080] border-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]",
  success:
    "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "font-mono text-[0.6875rem] tracking-wide uppercase",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("label-hud", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[12px]",
        "border border-dashed border-[var(--border-strong)] bg-[var(--bg-elev-1)]/50",
        "px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="text-[var(--fg-subtle)]">{icon}</div>}
      <div className="space-y-1">
        <h3 className="font-display text-base tracking-wide text-[var(--fg)]">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-[var(--fg-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
