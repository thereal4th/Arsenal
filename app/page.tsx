import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Layers,
  Move3d,
  NotebookPen,
  Share2,
  Shield,
} from "lucide-react";
import { auth } from "@/auth";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { HeroViewport } from "@/components/landing/hero-viewport";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="tactical-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="ambient-glow pointer-events-none absolute inset-0" aria-hidden />

      {/* ------------------------------------------------------------ nav */}
      <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Link href="/signin">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* ----------------------------------------------------------- hero */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="animate-fade-up">
            <p className="label-hud text-[var(--accent)]">
              BJJ &amp; MMA · Technique Intelligence
            </p>
            <h1 className="mt-3 font-display text-3xl leading-[1.1] tracking-wide text-[var(--fg)] sm:text-4xl lg:text-5xl">
              Stop describing positions.
              <span className="block text-[var(--primary-hover)]">Build them.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--fg-muted)]">
              Arsenal gives you two fully posable 3D training partners. Shape the
              exact position you drilled tonight, capture it, and file it into a
              connected map of your game — instead of a folder of notes you will
              never read again.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start your arsenal
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline">
                  I already have an account
                </Button>
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--fg-subtle)]">
              <li>20+ built-in positions</li>
              <li>Collision-aware posing</li>
              <li>Every pose saved as portable JSON</li>
            </ul>
          </div>

          <div className="edge-light relative aspect-[4/3] w-full lg:aspect-square">
            <HeroViewport preset="closed-guard" />
            <p className="label-hud absolute bottom-3 left-4 text-[var(--fg-subtle)]">
              Closed guard · live preview
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- features */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl tracking-wide text-[var(--fg)]">
          Three tools, one loop
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
          Pose it, write it down, connect it. That is the whole workflow.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Feature
            icon={<Move3d className="size-5" aria-hidden />}
            step="01"
            title="Pose two mannequins"
            body="Grab a hand or a foot and drag — inverse kinematics works out the joints for you. Need precision? Switch to advanced mode and dial in every angle with anatomical limits enforced. The figures collide, so pushing one into the other moves both."
          />
          <Feature
            icon={<NotebookPen className="size-5" aria-hidden />}
            step="02"
            title="Capture it into a note"
            body="One click turns the viewport into an image attached to a technique note. The full 3D scene is saved alongside it, so you can reopen any capture and keep posing from exactly where you left off."
          />
          <Feature
            icon={<Boxes className="size-5" aria-hidden />}
            step="03"
            title="Wire up a system"
            body="Drop your techniques onto a canvas and connect them. Closed guard to hip bump to mount to armbar — with the branches for what happens when they defend. Click any node to jump straight into the notes."
          />
        </div>
      </section>

      {/* -------------------------------------------------------- secondary */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Small
            icon={<Layers className="size-4" aria-hidden />}
            title="Your own presets"
            body="Start from a built-in position, adjust it, and save it under any name. Save again with the same name and it overwrites. Built-in positions stay untouched."
          />
          <Small
            icon={<Share2 className="size-4" aria-hidden />}
            title="Share anything"
            body="Notes, systems and presets each get a private link you can hand to a training partner or a coach. Turn it off and the link dies."
          />
          <Small
            icon={<Shield className="size-4" aria-hidden />}
            title="Yours by default"
            body="Everything is private until you say otherwise. Poses are plain JSON — portable, diffable, and yours."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="edge-light p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl tracking-wide text-[var(--fg)]">
            Your game deserves better than a notes app
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--fg-muted)]">
            Free to start. Build your first position in about a minute.
          </p>
          <Link href="/signup" className="mt-6 inline-block">
            <Button size="lg">
              Create your account
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-[var(--fg-subtle)]">
          <span>Arsenal — technique intelligence for grapplers.</span>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  step,
  title,
  body,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <Card className="h-full p-5">
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-[8px] bg-[var(--primary-soft)] text-[var(--primary-hover)]">
          {icon}
        </span>
        <span className="font-mono text-xs text-[var(--fg-subtle)]">{step}</span>
      </div>
      <h3 className="mt-4 font-display text-base tracking-wide text-[var(--fg)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{body}</p>
    </Card>
  );
}

function Small({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev-1)] p-4">
      <div className="flex items-center gap-2 text-[var(--accent)]">
        {icon}
        <h3 className="text-sm font-medium text-[var(--fg)]">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">{body}</p>
    </div>
  );
}
