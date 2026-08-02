"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Layers,
  Link2,
  Lock,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { api, RequestError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Badge, SectionLabel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import {
  DEFAULT_PRESETS,
  isDefaultPreset,
  PRESET_CATEGORIES,
  presetsByCategory,
} from "@/lib/mannequin/presets";
import { cloneScene } from "@/lib/mannequin/pose";
import { useEditor } from "@/lib/mannequin/store";
import type { Preset } from "@/lib/types";

interface PresetPanelProps {
  /** Renders the current viewport to a PNG data URL for the preset thumbnail. */
  capture?: () => string | null;
}

export function PresetPanel({ capture }: PresetPanelProps) {
  const toast = useToast();
  const loadScene = useEditor((s) => s.loadScene);
  const scene = useEditor((s) => s.scene);
  const loadedPresetName = useEditor((s) => s.loadedPresetName);
  const loadedPresetIsDefault = useEditor((s) => s.loadedPresetIsDefault);

  const [custom, setCustom] = useState<Preset[]>([]);
  const [query, setQuery] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ presets: Preset[] }>("/api/presets");
      setCustom(data.presets);
    } catch {
      // Presets are an enhancement here; the built-in library still works
      // offline or before the database is configured.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grouped = useMemo(() => presetsByCategory(), []);
  const needle = query.trim().toLowerCase();

  const matches = (name: string, description: string) =>
    !needle ||
    name.toLowerCase().includes(needle) ||
    description.toLowerCase().includes(needle);

  const filteredCustom = custom.filter((p) => matches(p.name, p.description));

  const remove = async (preset: Preset) => {
    if (!window.confirm(`Delete the preset "${preset.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api(`/api/presets/${preset.id}`, { method: "DELETE" });
      setCustom((list) => list.filter((p) => p.id !== preset.id));
      toast(`Deleted "${preset.name}".`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete.", "error");
    }
  };

  const share = async (preset: Preset) => {
    try {
      const next = preset.visibility === "link" ? "private" : "link";
      const data = await api<{ preset: Preset }>(`/api/presets/${preset.id}`, {
        method: "PATCH",
        json: { visibility: next },
      });
      setCustom((list) => list.map((p) => (p.id === preset.id ? data.preset : p)));

      if (data.preset.shareToken) {
        const url = `${window.location.origin}/share/preset/${data.preset.shareToken}`;
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast("Share link copied to your clipboard.", "success");
      } else {
        toast("Sharing turned off. The old link no longer works.", "info");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update.", "error");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-[var(--border)] p-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Positions</SectionLabel>
          {loadedPresetName && (
            <Badge tone={loadedPresetIsDefault ? "neutral" : "accent"}>
              {loadedPresetIsDefault ? "built-in" : "custom"}
            </Badge>
          )}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search positions"
            aria-label="Search positions"
            className="h-9 pl-8 text-[0.8125rem]"
          />
        </div>

        <Button size="sm" className="w-full" onClick={() => setSaveOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
          Save current as preset
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ------------------------------------------------------ custom */}
        {filteredCustom.length > 0 && (
          <section className="border-b border-[var(--border)] p-3">
            <SectionLabel className="mb-2">Your presets</SectionLabel>
            <ul className="space-y-1.5">
              {filteredCustom.map((preset) => (
                <li key={preset.id} className="group/preset">
                  <div
                    className={cn(
                      "flex items-stretch gap-2 rounded-[8px] border p-1.5 transition-colors",
                      "border-[var(--border)] bg-[var(--bg-inset)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        loadScene(preset.scene, { name: preset.name, isDefault: false })
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {preset.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preset.thumbnail}
                          alt=""
                          className="size-10 shrink-0 rounded-[5px] border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--border)] text-[var(--fg-subtle)]">
                          <Bookmark className="size-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] text-[var(--fg)]">
                          {preset.name}
                        </span>
                        <span className="block truncate text-[0.6875rem] text-[var(--fg-subtle)]">
                          {preset.category}
                        </span>
                      </span>
                    </button>

                    <div className="flex flex-col justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => share(preset)}
                        title={
                          preset.visibility === "link"
                            ? "Sharing on — click to make private"
                            : "Share with a link"
                        }
                        aria-label={
                          preset.visibility === "link" ? "Stop sharing" : "Share preset"
                        }
                        className={cn(
                          "rounded p-1 transition-colors",
                          preset.visibility === "link"
                            ? "text-[var(--accent)]"
                            : "text-[var(--fg-subtle)] hover:text-[var(--fg)]",
                        )}
                      >
                        {preset.visibility === "link" ? (
                          <Link2 className="size-3.5" aria-hidden />
                        ) : (
                          <Lock className="size-3.5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(preset)}
                        aria-label={`Delete ${preset.name}`}
                        className="rounded p-1 text-[var(--fg-subtle)] transition-colors hover:text-[var(--danger)]"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ----------------------------------------------------- built-in */}
        {grouped.map(({ category, presets }) => {
          const visible = presets.filter((p) => matches(p.name, p.description));
          if (visible.length === 0) return null;

          return (
            <section key={category} className="border-b border-[var(--border)] p-3">
              <SectionLabel className="mb-2">{category}</SectionLabel>
              <ul className="space-y-1">
                {visible.map((preset) => (
                  <li key={preset.slug}>
                    <button
                      type="button"
                      onClick={() =>
                        loadScene(preset.scene, { name: preset.name, isDefault: true })
                      }
                      className={cn(
                        "w-full rounded-[8px] border px-2.5 py-2 text-left transition-colors duration-150",
                        loadedPresetName === preset.name
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                          : "border-transparent hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev-2)]",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--fg)]">
                        {preset.name}
                        {loadedPresetName === preset.name && (
                          <Check className="size-3 text-[var(--primary-hover)]" aria-hidden />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[0.6875rem] leading-snug text-[var(--fg-subtle)]">
                        {preset.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="px-3 py-4 text-[0.6875rem] leading-relaxed text-[var(--fg-subtle)]">
          <Layers className="mr-1 inline size-3 align-[-2px]" aria-hidden />
          {DEFAULT_PRESETS.length} built-in positions. Load one, adjust it, then save
          it under a new name to make it yours — built-ins can never be overwritten.
        </p>
      </div>

      <SavePresetDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        existing={custom}
        capture={capture}
        defaultName={loadedPresetIsDefault ? "" : (loadedPresetName ?? "")}
        onSaved={(preset, overwritten) => {
          setCustom((list) => {
            const rest = list.filter((p) => p.id !== preset.id);
            return [preset, ...rest];
          });
          loadScene(cloneScene(scene), { name: preset.name, isDefault: false });
          toast(
            overwritten
              ? `Updated "${preset.name}".`
              : `Saved "${preset.name}" to your presets.`,
            "success",
          );
          setSaveOpen(false);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Save dialog                                                                */
/* -------------------------------------------------------------------------- */

function SavePresetDialog({
  open,
  onClose,
  existing,
  capture,
  defaultName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  existing: Preset[];
  capture?: () => string | null;
  defaultName: string;
  onSaved: (preset: Preset, overwritten: boolean) => void;
}) {
  const scene = useEditor((s) => s.scene);
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState<string>("Custom");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setError(null);
    }
  }, [open, defaultName]);

  const slug = slugify(name);
  const collidesWithDefault = Boolean(slug) && isDefaultPreset(slug);
  const willOverwrite = existing.some((p) => p.slug === slug);

  const submit = async () => {
    setError(null);

    if (collidesWithDefault) {
      setError(
        "That name belongs to a built-in position. Built-ins cannot be overwritten — pick another name.",
      );
      return;
    }

    setSaving(true);
    try {
      const data = await api<{ preset: Preset; overwritten: boolean }>("/api/presets", {
        method: "POST",
        json: {
          name: name.trim(),
          category,
          description: description.trim(),
          scene,
          thumbnail: capture?.() ?? null,
          visibility: "private",
          overwrite: true,
        },
      });
      onSaved(data.preset, data.overwritten);
    } catch (err) {
      setError(
        err instanceof RequestError
          ? err.message
          : "Could not save the preset. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save preset"
      description="Stores the exact joint angles and placement of both figures."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={saving}
            disabled={!name.trim() || collidesWithDefault}
          >
            {willOverwrite ? "Overwrite preset" : "Save preset"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Name"
          required
          error={error ?? undefined}
          hint={
            willOverwrite
              ? `This replaces your existing preset "${name.trim()}".`
              : "Reusing one of your existing preset names will overwrite it."
          }
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep half — knee shield"
              maxLength={60}
              autoFocus
            />
          )}
        </Field>

        <Field label="Category">
          {({ id }) => (
            <Select
              id={id}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Custom">Custom</option>
              {PRESET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Description" hint="Optional. Shown under the preset name.">
          {({ id }) => (
            <Textarea
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={240}
              placeholder="What makes this position worth saving?"
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
