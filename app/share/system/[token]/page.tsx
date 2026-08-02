import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedSystem } from "@/lib/data";
import { SectionLabel } from "@/components/ui/surface";
import { SystemPreview } from "@/components/systems/system-preview";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const system = await getSharedSystem(token);
  return {
    title: system?.title ?? "Shared system",
    description: system?.description || undefined,
    robots: { index: false },
  };
}

export default async function SharedSystemPage({ params }: Props) {
  const { token } = await params;
  const system = await getSharedSystem(token);
  if (!system) notFound();

  return (
    <article>
      <SectionLabel>Shared system</SectionLabel>
      <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
        {system.title}
      </h1>
      {system.description && (
        <p className="mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
          {system.description}
        </p>
      )}

      <div className="mt-6">
        <SystemPreview system={system} />
      </div>

      <p className="mt-3 text-xs text-[var(--fg-subtle)]">
        {system.nodes.length} nodes · {system.edges.length} connections. Drag to pan,
        scroll to zoom.
      </p>
    </article>
  );
}
