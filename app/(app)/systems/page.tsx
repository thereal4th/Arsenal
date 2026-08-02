import Link from "next/link";
import { Boxes } from "lucide-react";
import { listSystems } from "@/lib/data";
import { relativeTime } from "@/lib/utils";
import { Badge, Card, EmptyState, SectionLabel } from "@/components/ui/surface";
import { NewSystemButton } from "@/components/systems/new-system-button";

export const metadata = { title: "Systems" };

export default async function SystemsPage() {
  const systems = await listSystems();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Game plan</SectionLabel>
          <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
            Systems
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--fg-muted)]">
            Wire your techniques into decision trees — what you hit first, and where
            you go when they defend.
          </p>
        </div>

        <NewSystemButton />
      </header>

      {systems.length === 0 ? (
        <EmptyState
          icon={<Boxes className="size-7" aria-hidden />}
          title="No systems yet"
          description="A system turns a pile of isolated techniques into a connected game. Start with one position and branch out from there."
          action={<NewSystemButton />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <li key={system.id}>
              <Link href={`/systems/${system.id}`} className="block h-full">
                <Card interactive className="flex h-full flex-col p-4">
                  <h2 className="text-sm font-medium text-[var(--fg)]">
                    {system.title}
                  </h2>
                  {system.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-[var(--fg-muted)]">
                      {system.description}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                    <Badge>{system.nodeCount} nodes</Badge>
                    <Badge>{system.edgeCount} links</Badge>
                    {system.visibility === "link" && <Badge tone="accent">shared</Badge>}
                    <span className="ml-auto text-[0.6875rem] text-[var(--fg-subtle)]">
                      {relativeTime(system.updatedAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
