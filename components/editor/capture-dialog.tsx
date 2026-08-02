"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "@/lib/mannequin/store";
import type { Note, NoteSummary } from "@/lib/types";

interface CaptureDialogProps {
  open: boolean;
  onClose: () => void;
  capture: () => string | null;
}

/**
 * Captures the viewport as a still and files it into a technique note — either
 * appended to an existing note or as the first frame of a brand new one.
 */
export function CaptureDialog({ open, onClose, capture }: CaptureDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const scene = useEditor((s) => s.scene);
  const loadedPresetName = useEditor((s) => s.loadedPresetName);

  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [targetId, setTargetId] = useState<string>("new");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot the canvas the moment the dialog opens, before the scrim covers it.
  useEffect(() => {
    if (!open) return;
    setImage(capture());
    setError(null);
    setCaption("");
    setTitle(loadedPresetName ?? "");

    api<{ notes: NoteSummary[] }>("/api/notes")
      .then((data) => setNotes(data.notes))
      .catch(() => setNotes([]));
  }, [open, capture, loadedPresetName]);

  const submit = async () => {
    if (!image) {
      setError("The viewport could not be captured. Try again.");
      return;
    }

    setSaving(true);
    setError(null);

    const frame = {
      id: `frame-${Date.now()}`,
      caption: caption.trim(),
      scene,
      thumbnail: image,
    };

    try {
      if (targetId === "new") {
        const data = await api<{ note: Note }>("/api/notes", {
          method: "POST",
          json: {
            title: title.trim() || "Untitled technique",
            summary: "",
            category: "Uncategorised",
            tags: [],
            body: "",
            frames: [frame],
            visibility: "private",
          },
        });
        toast("Technique created.", "success");
        onClose();
        router.push(`/notes/${data.note.id}`);
      } else {
        // Fetch first so the append never clobbers frames added elsewhere.
        const current = await api<{ note: Note }>(`/api/notes/${targetId}`);
        await api(`/api/notes/${targetId}`, {
          method: "PATCH",
          json: { frames: [...current.note.frames, frame] },
        });
        toast(`Added to "${current.note.title}".`, "success");
        onClose();
        router.push(`/notes/${targetId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the capture. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capture position"
      description="Saves the image and the full pose data, so you can reopen and edit it later."
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!image}>
            {targetId === "new" ? "Create technique" : "Add to technique"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-inset)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Captured position preview" className="w-full" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-[var(--fg-subtle)]">
              <ImageOff className="size-6" aria-hidden />
              <p className="text-sm">Nothing captured yet.</p>
            </div>
          )}
        </div>

        <Field label="Caption" hint="Optional. What should someone notice here?">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              maxLength={240}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Left hand controls the wrist, right elbow stays inside"
            />
          )}
        </Field>

        <fieldset>
          <legend className="mb-2 text-[0.8125rem] font-medium text-[var(--fg)]">
            Add to
          </legend>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2 transition-colors",
                targetId === "new"
                  ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]",
              )}
            >
              <input
                type="radio"
                name="capture-target"
                value="new"
                checked={targetId === "new"}
                onChange={() => setTargetId("new")}
                className="accent-[var(--primary)]"
              />
              <FilePlus2 className="size-4 text-[var(--fg-muted)]" aria-hidden />
              <span className="text-[0.8125rem] text-[var(--fg)]">
                New technique
              </span>
            </label>

            {notes.map((note) => (
              <label
                key={note.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2 transition-colors",
                  targetId === note.id
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]",
                )}
              >
                <input
                  type="radio"
                  name="capture-target"
                  value={note.id}
                  checked={targetId === note.id}
                  onChange={() => setTargetId(note.id)}
                  className="accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] text-[var(--fg)]">
                    {note.title}
                  </span>
                  <span className="block text-[0.6875rem] text-[var(--fg-subtle)]">
                    {note.frameCount} frame{note.frameCount === 1 ? "" : "s"} ·{" "}
                    {note.category}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {targetId === "new" && (
          <Field label="Technique name" required error={error ?? undefined}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Armbar from closed guard"
                maxLength={120}
              />
            )}
          </Field>
        )}

        {error && targetId !== "new" && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
