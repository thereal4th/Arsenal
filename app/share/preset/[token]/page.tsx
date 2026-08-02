import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedPreset } from "@/lib/data";
import { Badge, Card, SectionLabel } from "@/components/ui/surface";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const preset = await getSharedPreset(token);
  return {
    title: preset?.name ?? "Shared position",
    robots: { index: false },
  };
}

export default async function SharedPresetPage({ params }: Props) {
  const { token } = await params;
  const preset = await getSharedPreset(token);
  if (!preset) notFound();

  return (
    <article>
      <SectionLabel>Shared position</SectionLabel>
      <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
        {preset.name}
      </h1>
      {preset.description && (
        <p className="mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
          {preset.description}
        </p>
      )}
      <div className="mt-3">
        <Badge>{preset.category}</Badge>
      </div>

      {preset.thumbnail && (
        <Card className="mt-6 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preset.thumbnail}
            alt={preset.name}
            className="w-full bg-[var(--bg-inset)]"
          />
        </Card>
      )}

      <details className="mt-6 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev-1)] p-4">
        <summary className="cursor-pointer text-sm text-[var(--fg)]">
          Pose data (JSON)
        </summary>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          Every joint angle and camera position lives in this object. Copy it to
          recreate the position anywhere.
        </p>
        <pre className="mt-3 max-h-80 overflow-auto rounded-[8px] bg-[var(--bg-inset)] p-3 font-mono text-[0.6875rem] leading-relaxed text-[var(--fg-muted)]">
          {JSON.stringify(preset.scene, null, 2)}
        </pre>
      </details>
    </article>
  );
}
