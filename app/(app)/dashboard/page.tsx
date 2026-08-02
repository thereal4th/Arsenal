import Link from "next/link";
import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { countPresets, listNotes, listSystems } from "@/lib/data";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, SectionLabel } from "@/components/ui/surface";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Boxes,
  NotebookPen,
  Rotate3d,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const configured = isDatabaseConfigured();

  const [notes, systems, presetCount] = await Promise.all([
    listNotes(),
    listSystems(),
    countPresets(),
  ]);

  const firstName = (session?.user?.name ?? "Athlete").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <SectionLabel>Dashboard</SectionLabel>
        <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Pick up where you left off, or build a new position from scratch.
        </p>
      </header>

      {!configured && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-[10px] border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] p-4"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-[var(--warning)]"
            aria-hidden
          />
          <div className="text-sm">
            <p className="font-medium text-[var(--fg)]">Database not connected</p>
            <p className="mt-0.5 text-[var(--fg-muted)]">
              Add <code className="font-mono text-xs">MONGODB_CONNECTION_STRING</code>{" "}
              to your <code className="font-mono text-xs">.env</code> file to save
              techniques, systems and presets. The 3D editor works without it.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- stats */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatCard
          href="/notes"
          icon={<NotebookPen className="size-4" aria-hidden />}
          label="Techniques"
          value={notes.length}
        />
        <StatCard
          href="/systems"
          icon={<Boxes className="size-4" aria-hidden />}
          label="Systems"
          value={systems.length}
        />
        <StatCard
          href="/editor"
          icon={<Bookmark className="size-4" aria-hidden />}
          label="Saved presets"
          value={presetCount}
        />
      </div>

      {/* -------------------------------------------------------------- CTA */}
      <Card className="ambient-glow relative mb-8 overflow-hidden p-6">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg tracking-wide text-[var(--fg)]">
              Build a position
            </h2>
            <p className="mt-1 max-w-md text-sm text-[var(--fg-muted)]">
              Drop into the 3D editor, start from one of the built-in positions,
              and shape it into exactly what happened on the mat.
            </p>
          </div>
          <Link href="/editor">
            <Button size="lg">
              <Rotate3d className="size-4" aria-hidden />
              Open editor
            </Button>
          </Link>
        </div>
      </Card>

      {/* ------------------------------------------------------------ recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Recent techniques</SectionLabel>
            <Link
              href="/notes"
              className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              View all
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>

          {notes.length === 0 ? (
            <EmptyState
              icon={<NotebookPen className="size-6" aria-hidden />}
              title="No techniques yet"
              description="Capture a position in the editor to create your first one."
            />
          ) : (
            <ul className="space-y-2">
              {notes.slice(0, 5).map((note) => (
                <li key={note.id}>
                  <Link href={`/notes/${note.id}`}>
                    <Card interactive className="flex items-center gap-3 p-2.5">
                      {note.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={note.cover}
                          alt=""
                          className="size-12 shrink-0 rounded-[6px] border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--fg-subtle)]">
                          <NotebookPen className="size-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--fg)]">
                          {note.title}
                        </span>
                        <span className="block truncate text-xs text-[var(--fg-subtle)]">
                          {note.category} · {relativeTime(note.updatedAt)}
                        </span>
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Recent systems</SectionLabel>
            <Link
              href="/systems"
              className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              View all
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>

          {systems.length === 0 ? (
            <EmptyState
              icon={<Boxes className="size-6" aria-hidden />}
              title="No systems yet"
              description="Connect your techniques into a map of how the position actually flows."
            />
          ) : (
            <ul className="space-y-2">
              {systems.slice(0, 5).map((system) => (
                <li key={system.id}>
                  <Link href={`/systems/${system.id}`}>
                    <Card interactive className="p-3">
                      <p className="truncate text-sm text-[var(--fg)]">
                        {system.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--fg-subtle)]">
                        {system.nodeCount} nodes · {system.edgeCount} links ·{" "}
                        {relativeTime(system.updatedAt)}
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link href={href}>
      <Card interactive className="flex items-center gap-3 p-4">
        <span className="flex size-9 items-center justify-center rounded-[8px] bg-[var(--bg-elev-3)] text-[var(--fg-muted)]">
          {icon}
        </span>
        <span>
          <span className="block font-display text-xl text-[var(--fg)]">{value}</span>
          <span className="label-hud">{label}</span>
        </span>
      </Card>
    </Link>
  );
}
