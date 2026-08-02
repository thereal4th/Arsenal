import Link from "next/link";
import { NotebookPen, Plus, Rotate3d } from "lucide-react";
import { listNotes } from "@/lib/data";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, SectionLabel } from "@/components/ui/surface";

export const metadata = { title: "Techniques" };

export default async function NotesPage() {
  const notes = await listNotes();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Library</SectionLabel>
          <h1 className="mt-1 font-display text-2xl tracking-wide text-[var(--fg)]">
            Techniques
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {notes.length} technique{notes.length === 1 ? "" : "s"} in your arsenal.
          </p>
        </div>

        <Link href="/editor">
          <Button>
            <Plus className="size-4" aria-hidden />
            New technique
          </Button>
        </Link>
      </header>

      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-7" aria-hidden />}
          title="Your library is empty"
          description="Open the 3D editor, pose the position you drilled today, and capture it. The image and the pose data are both saved."
          action={
            <Link href="/editor">
              <Button>
                <Rotate3d className="size-4" aria-hidden />
                Open the editor
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Link href={`/notes/${note.id}`} className="block h-full">
                <Card interactive className="flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[16/10] bg-[var(--bg-inset)] tactical-grid-fine">
                    {note.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={note.cover}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[var(--fg-subtle)]">
                        <NotebookPen className="size-6" aria-hidden />
                      </div>
                    )}
                    {note.frameCount > 1 && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[0.625rem] text-[var(--fg)]">
                        {note.frameCount} frames
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h2 className="line-clamp-2 text-sm font-medium text-[var(--fg)]">
                      {note.title}
                    </h2>
                    {note.summary && (
                      <p className="line-clamp-2 text-xs text-[var(--fg-muted)]">
                        {note.summary}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <Badge>{note.category}</Badge>
                      {note.visibility === "link" && <Badge tone="accent">shared</Badge>}
                      <span className="ml-auto text-[0.6875rem] text-[var(--fg-subtle)]">
                        {relativeTime(note.updatedAt)}
                      </span>
                    </div>
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
