import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="tactical-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <header className="relative z-10 mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <Link href="/signup">
          <Button size="sm" variant="outline">
            Build your own
          </Button>
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
