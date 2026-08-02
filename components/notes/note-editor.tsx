"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Rotate3d,
  Trash2,
  X,
} from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Card, SectionLabel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "@/lib/mannequin/store";
import type { Frame, Note } from "@/lib/types";

const CATEGORIES = [
  "Uncategorised",
  "Guard",
  "Passing",
  "Top control",
  "Back attacks",
  "Submissions",
  "Escapes",
  "Takedowns",
  "Striking",
  "Conditioning",
];

/** Debounce for autosave. Long enough to batch typing, short enough to feel safe. */
const SAVE_DELAY = 900;

export function NoteEditor({ note: initial }: { note: Note }) {
  const router = useRouter();
  const toast = useToast();
  const loadScene = useEditor((s) => s.loadScene);

  const [note, setNote] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lightbox, setLightbox] = useState<Frame | null>(null);
  const [tagDraft, setTagDraft] = useState("");

  const timer = useRef<number | null>(null);
  const pending = useRef<Partial<Note> | null>(null);

  const queueSave = (patch: Partial<Note>) => {
    setNote((current) => ({ ...current, ...patch }));
    pending.current = { ...pending.current, ...patch };

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const payload = pending.current;
      pending.current = null;
      if (!payload) return;

      setStatus("saving");
      try {
        await api(`/api/notes/${note.id}`, { method: "PATCH", json: payload });
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 1600);
      } catch (error) {
        setStatus("idle");
        toast(
          error instanceof Error ? error.message : "Could not save your changes.",
          "error",
        );
      }
    }, SAVE_DELAY);
  };

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const toggleShare = async () => {
    const next = note.visibility === "link" ? "private" : "link";
    try {
      const data = await api<{ note: Note }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        json: { visibility: next },
      });
      setNote(data.note);
      if (data.note.shareToken) {
        const url = `${window.location.origin}/share/note/${data.note.shareToken}`;
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast("Share link copied to your clipboard.", "success");
      } else {
        toast("Sharing turned off. The old link no longer works.", "info");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update.", "error");
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/notes/${note.id}`, { method: "DELETE" });
      toast("Technique deleted.", "success");
      router.push("/notes");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete.", "error");
    }
  };

  const removeFrame = (id: string) => {
    queueSave({ frames: note.frames.filter((f) => f.id !== id) });
  };

  const openInEditor = (frame: Frame) => {
    loadScene(frame.scene, { name: note.title, isDefault: false });
    router.push("/editor");
  };

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || note.tags.includes(tag) || note.tags.length >= 20) return;
    queueSave({ tags: [...note.tags, tag] });
    setTagDraft("");
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ------------------------------------------------------------ header */}
      <div className="mb-5 flex items-center gap-2">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Techniques
        </Link>

        <span className="ml-auto flex items-center gap-2" aria-live="polite">
          {status === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-subtle)]">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Saving
            </span>
          )}
          {status === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--success)]">
              <Check className="size-3" aria-hidden />
              Saved
            </span>
          )}
        </span>

        <Button
          variant={note.visibility === "link" ? "accent" : "outline"}
          size="sm"
          onClick={toggleShare}
        >
          {note.visibility === "link" ? (
            <Link2 className="size-3.5" aria-hidden />
          ) : (
            <Lock className="size-3.5" aria-hidden />
          )}
          {note.visibility === "link" ? "Shared" : "Share"}
        </Button>

        <Button variant="danger" size="sm" onClick={remove} aria-label="Delete technique">
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>

      {/* -------------------------------------------------------------- meta */}
      <div className="mb-6 space-y-4">
        <input
          value={note.title}
          onChange={(e) => queueSave({ title: e.target.value })}
          aria-label="Technique name"
          maxLength={120}
          className={cn(
            "w-full bg-transparent font-display text-2xl tracking-wide text-[var(--fg)]",
            "border-b border-transparent pb-1 outline-none",
            "focus:border-[var(--primary)] hover:border-[var(--border)]",
            "transition-colors placeholder:text-[var(--fg-subtle)]",
          )}
          placeholder="Name this technique"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            {({ id }) => (
              <Select
                id={id}
                value={note.category}
                onChange={(e) => queueSave({ category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Tags" hint="Press Enter to add.">
            {({ id }) => (
              <Input
                id={id}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="gi, competition, white-belt"
                maxLength={30}
              />
            )}
          </Field>
        </div>

        {note.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => queueSave({ tags: note.tags.filter((t) => t !== tag) })}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elev-2)] px-2 py-0.5 text-[0.6875rem] text-[var(--fg-muted)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  {tag}
                  <X className="size-2.5" aria-hidden />
                  <span className="sr-only">Remove tag</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Field label="One-line summary">
          {({ id }) => (
            <Input
              id={id}
              value={note.summary}
              onChange={(e) => queueSave({ summary: e.target.value })}
              maxLength={400}
              placeholder="The detail that makes it work"
            />
          )}
        </Field>
      </div>

      {/* ------------------------------------------------------------ frames */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Positions ({note.frames.length})</SectionLabel>
          <Link href="/editor">
            <Button variant="outline" size="sm">
              <Rotate3d className="size-3.5" aria-hidden />
              Capture another
            </Button>
          </Link>
        </div>

        {note.frames.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-[var(--fg-muted)]">
              No positions captured yet.
            </p>
            <Link href="/editor" className="mt-3 inline-block">
              <Button size="sm">Open the 3D editor</Button>
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {note.frames.map((frame, index) => (
              <li key={frame.id}>
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLightbox(frame)}
                    className="block w-full"
                    aria-label={`View position ${index + 1} full size`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.thumbnail}
                      alt={frame.caption || `Position ${index + 1}`}
                      className="w-full bg-[var(--bg-inset)]"
                      loading="lazy"
                    />
                  </button>

                  <div className="space-y-2 p-3">
                    <Textarea
                      rows={2}
                      value={frame.caption}
                      aria-label={`Caption for position ${index + 1}`}
                      placeholder="Add a caption"
                      maxLength={240}
                      onChange={(e) =>
                        queueSave({
                          frames: note.frames.map((f) =>
                            f.id === frame.id ? { ...f, caption: e.target.value } : f,
                          ),
                        })
                      }
                      className="min-h-0 text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => openInEditor(frame)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit pose
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeFrame(frame.id)}
                        aria-label={`Remove position ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------------- body */}
      <section>
        <SectionLabel className="mb-2">Notes</SectionLabel>
        <Textarea
          value={note.body}
          onChange={(e) => queueSave({ body: e.target.value })}
          rows={14}
          maxLength={60_000}
          placeholder={
            "Steps, grips, common mistakes, what your coach said...\n\n1. \n2. \n3. "
          }
          className="font-mono text-[0.8125rem] leading-relaxed"
        />
        <p className="mt-2 text-[0.6875rem] text-[var(--fg-subtle)]">
          Last updated {relativeTime(note.updatedAt)}.
        </p>
      </section>

      {/* ---------------------------------------------------------- lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Position preview"
        >
          <div className="max-h-full max-w-3xl overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.thumbnail}
              alt={lightbox.caption || "Captured position"}
              className="w-full rounded-[10px] border border-[var(--border)]"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-[var(--fg-muted)]">
                {lightbox.caption}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 rounded-full bg-[var(--bg-elev-2)] p-2 text-[var(--fg)]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {note.visibility === "link" && note.shareToken && (
        <p className="mt-6 flex items-center gap-2 text-xs text-[var(--fg-subtle)]">
          <Badge tone="accent">public link</Badge>
          Anyone with the link can read this technique.
        </p>
      )}
    </div>
  );
}
