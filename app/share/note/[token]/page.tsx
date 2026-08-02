import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedNote } from "@/lib/data";
import { Badge, Card, SectionLabel } from "@/components/ui/surface";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const note = await getSharedNote(token);
  return {
    title: note?.title ?? "Shared technique",
    description: note?.summary || undefined,
    robots: { index: false },
  };
}

export default async function SharedNotePage({ params }: Props) {
  const { token } = await params;
  const note = await getSharedNote(token);
  if (!note) notFound();

  return (
    <article>
      <SectionLabel>Shared technique</SectionLabel>
      <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
        {note.title}
      </h1>
      {note.summary && (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{note.summary}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{note.category}</Badge>
        {note.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      {note.frames.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {note.frames.map((frame, index) => (
            <li key={frame.id}>
              <Card className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.thumbnail}
                  alt={frame.caption || `Position ${index + 1}`}
                  className="w-full bg-[var(--bg-inset)]"
                  loading="lazy"
                />
                {frame.caption && (
                  <p className="p-3 text-xs text-[var(--fg-muted)]">{frame.caption}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {note.body && (
        <div className="mt-8">
          <SectionLabel className="mb-2">Notes</SectionLabel>
          <pre className="whitespace-pre-wrap rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev-1)] p-4 font-mono text-[0.8125rem] leading-relaxed text-[var(--fg)]">
            {note.body}
          </pre>
        </div>
      )}
    </article>
  );
}
