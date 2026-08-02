import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Arsenal home"
    >
      <Mark className="size-7 shrink-0" />
      {showText && (
        <span className="font-display text-[0.9375rem] font-bold tracking-[0.18em] text-[var(--fg)] uppercase">
          Arsenal
        </span>
      )}
    </Link>
  );
}

/**
 * Chevron stack inside a chamfered plate — reads as both a rank insignia and a
 * layered "system", which is what the product is about.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="Arsenal"
    >
      <path
        d="M6 2h20l4 4v20l-4 4H6l-4-4V6l4-4Z"
        fill="url(#arsenal-plate)"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
      />
      <path
        d="M9 20.5 16 11l7 9.5"
        stroke="#dc2626"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 25 16 18.8l4.5 6.2"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <defs>
        <linearGradient id="arsenal-plate" x1="2" y1="2" x2="30" y2="30">
          <stop stopColor="#1a1e26" />
          <stop offset="1" stopColor="#0d0f13" />
        </linearGradient>
      </defs>
    </svg>
  );
}
