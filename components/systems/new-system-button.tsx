"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { SystemGraph } from "@/lib/types";

export function NewSystemButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Give the system a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ system: SystemGraph }>("/api/systems", {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim(),
          nodes: [],
          edges: [],
          visibility: "private",
        },
      });
      toast("System created.", "success");
      router.push(`/systems/${data.system.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the system.");
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New system
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New system"
        description="A map of how your techniques connect from one position."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving}>
              Create system
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required error={error ?? undefined}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Closed guard system"
                maxLength={120}
                autoFocus
              />
            )}
          </Field>

          <Field label="Description" hint="Optional. What is this system for?">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={600}
                placeholder="Everything I hit from closed guard, and where it goes when they defend."
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
