import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="tactical-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="ambient-glow pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 flex h-14 items-center px-4 sm:px-6">
        <Wordmark />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>

      <footer className="relative z-10 px-4 py-6 text-center text-xs text-[var(--fg-subtle)]">
        <Link href="/" className="transition-colors hover:text-[var(--fg-muted)]">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
