"use client";

import { memo } from "react";
import Link from "next/link";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ExternalLink, Flag, NotebookPen, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TechniqueNodeData extends Record<string, unknown> {
  label: string;
  detail: string;
  kind: "technique" | "position" | "note";
  noteId: string | null;
  cover: string | null;
}

const KIND_STYLES = {
  // Position = where you are. Technique = what you do. Note = a reminder.
  position: {
    icon: Flag,
    accent: "var(--accent)",
    ring: "color-mix(in srgb, var(--accent) 45%, transparent)",
    tint: "color-mix(in srgb, var(--accent) 8%, var(--bg-elev-2))",
  },
  technique: {
    icon: NotebookPen,
    accent: "var(--primary-hover)",
    ring: "color-mix(in srgb, var(--primary) 45%, transparent)",
    tint: "color-mix(in srgb, var(--primary) 8%, var(--bg-elev-2))",
  },
  note: {
    icon: StickyNote,
    accent: "var(--fg-muted)",
    ring: "var(--border-strong)",
    tint: "var(--bg-elev-2)",
  },
} as const;

export const TechniqueNode = memo(function TechniqueNode({
  data,
  selected,
}: NodeProps & { data: TechniqueNodeData }) {
  const style = KIND_STYLES[data.kind] ?? KIND_STYLES.technique;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "w-52 overflow-hidden rounded-[10px] border transition-shadow duration-200",
        selected ? "shadow-[0_0_0_2px_var(--primary)]" : "shadow-none",
      )}
      style={{
        background: style.tint,
        borderColor: selected ? "var(--primary)" : style.ring,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        aria-label="Incoming connection point"
      />

      {data.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.cover}
          alt=""
          className="h-20 w-full border-b border-[var(--border)] object-cover"
          draggable={false}
        />
      )}

      <div className="p-2.5">
        <div className="flex items-start gap-1.5">
          <Icon
            className="mt-0.5 size-3.5 shrink-0"
            style={{ color: style.accent }}
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug font-medium text-[var(--fg)]">
            {data.label}
          </p>
          {data.noteId && (
            <Link
              href={`/notes/${data.noteId}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open ${data.label}`}
              className="shrink-0 rounded p-0.5 text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg)]"
            >
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          )}
        </div>

        {data.detail && (
          <p className="mt-1 line-clamp-2 text-[0.6875rem] leading-snug text-[var(--fg-muted)]">
            {data.detail}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        aria-label="Outgoing connection point"
      />
    </div>
  );
});
