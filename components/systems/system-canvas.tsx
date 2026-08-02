"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  ChevronLeft,
  Flag,
  Link2,
  Loader2,
  Lock,
  NotebookPen,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { TechniqueNode, type TechniqueNodeData } from "./technique-node";
import type { SystemGraph, NoteSummary } from "@/lib/types";
import type { SystemNodeDoc } from "@/lib/db";

const SAVE_DELAY = 900;
const nodeTypes = { technique: TechniqueNode };

const EDGE_DEFAULTS = {
  type: "smoothstep" as const,
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
};

const uid = () =>
  `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function toFlowNodes(
  docs: SystemNodeDoc[],
  covers: Map<string, string | null>,
): Node<TechniqueNodeData>[] {
  return docs.map((n) => ({
    id: n.id,
    type: "technique",
    position: n.position,
    data: {
      label: n.label,
      detail: n.detail,
      kind: n.kind,
      noteId: n.noteId,
      cover: n.noteId ? (covers.get(n.noteId) ?? null) : null,
    },
  }));
}

export function SystemCanvas(props: { system: SystemGraph; notes: NoteSummary[] }) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ system: initial, notes }: { system: SystemGraph; notes: NoteSummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const { screenToFlowPosition } = useReactFlow();

  const covers = useMemo(
    () => new Map(notes.map((n) => [n.id, n.cover])),
    [notes],
  );

  const [meta, setMeta] = useState({
    title: initial.title,
    description: initial.description,
    visibility: initial.visibility,
    shareToken: initial.shareToken,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TechniqueNodeData>>(
    toFlowNodes(initial.nodes, covers),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initial.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
      ...EDGE_DEFAULTS,
    })),
  );

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Node<TechniqueNodeData> | null>(null);

  /* ------------------------------------------------------------- autosave */
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      await api(`/api/systems/${initial.id}`, {
        method: "PATCH",
        json: {
          title: meta.title,
          description: meta.description,
          nodes: nodes.map<SystemNodeDoc>((n) => ({
            id: n.id,
            noteId: n.data.noteId,
            kind: n.data.kind,
            label: n.data.label,
            detail: n.data.detail,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: typeof e.label === "string" ? e.label : "",
          })),
        },
      });
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch (error) {
      setStatus("idle");
      toast(error instanceof Error ? error.message : "Could not save.", "error");
    }
  }, [edges, initial.id, meta.description, meta.title, nodes, toast]);

  // Only schedule a save once something has actually changed, so simply opening
  // a system does not write to the database.
  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_DELAY);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [nodes, edges, meta.title, meta.description, save]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<TechniqueNodeData>>[]) => {
      // Selection and hover changes are not worth a round trip.
      if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) {
        dirty.current = true;
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((c) => c.type !== "select")) dirty.current = true;
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      dirty.current = true;
      setEdges((current) =>
        addEdge({ ...connection, ...EDGE_DEFAULTS, id: uid() }, current),
      );
    },
    [setEdges],
  );

  /* ---------------------------------------------------------- node adding */
  const addNode = (
    payload: Pick<TechniqueNodeData, "label" | "detail" | "kind" | "noteId">,
  ) => {
    const container = document.getElementById("system-canvas");
    const rect = container?.getBoundingClientRect();
    const point = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? 800) / 2,
      y: (rect?.top ?? 0) + (rect?.height ?? 600) / 3,
    });

    dirty.current = true;
    setNodes((current) => [
      ...current,
      {
        id: uid(),
        type: "technique",
        // Nudge each new node so stacked additions stay visible.
        position: { x: point.x + current.length * 24, y: point.y + current.length * 18 },
        data: {
          ...payload,
          cover: payload.noteId ? (covers.get(payload.noteId) ?? null) : null,
        },
      },
    ]);
    setAddOpen(false);
  };

  const applyEdit = (patch: Partial<TechniqueNodeData>) => {
    if (!editing) return;
    dirty.current = true;
    setNodes((current) =>
      current.map((n) =>
        n.id === editing.id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
    setEditing(null);
  };

  const deleteNode = (id: string) => {
    dirty.current = true;
    setNodes((current) => current.filter((n) => n.id !== id));
    setEdges((current) => current.filter((e) => e.source !== id && e.target !== id));
    setEditing(null);
  };

  /* ------------------------------------------------------------- sharing */
  const toggleShare = async () => {
    const next = meta.visibility === "link" ? "private" : "link";
    try {
      const data = await api<{ system: SystemGraph }>(`/api/systems/${initial.id}`, {
        method: "PATCH",
        json: { visibility: next },
      });
      setMeta((m) => ({
        ...m,
        visibility: data.system.visibility,
        shareToken: data.system.shareToken,
      }));
      if (data.system.shareToken) {
        const url = `${window.location.origin}/share/system/${data.system.shareToken}`;
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast("Share link copied to your clipboard.", "success");
      } else {
        toast("Sharing turned off.", "info");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update.", "error");
    }
  };

  const removeSystem = async () => {
    if (!window.confirm(`Delete "${meta.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/systems/${initial.id}`, { method: "DELETE" });
      toast("System deleted.", "success");
      router.push("/systems");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete.", "error");
    }
  };

  return (
    <div className="flex h-full min-h-dvh flex-col md:h-dvh md:min-h-0">
      {/* ------------------------------------------------------------ bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elev-1)] px-3 py-2">
        <Link
          href="/systems"
          aria-label="Back to systems"
          className="rounded p-1.5 text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>

        <input
          value={meta.title}
          onChange={(e) => {
            dirty.current = true;
            setMeta((m) => ({ ...m, title: e.target.value }));
          }}
          aria-label="System name"
          maxLength={120}
          className="min-w-0 flex-1 truncate rounded bg-transparent px-1 py-0.5 font-display text-sm tracking-wide text-[var(--fg)] outline-none transition-colors hover:bg-[var(--bg-elev-2)] focus:bg-[var(--bg-elev-2)]"
        />

        <span aria-live="polite" className="hidden sm:block">
          {status === "saving" && (
            <Loader2 className="size-3.5 animate-spin text-[var(--fg-subtle)]" aria-label="Saving" />
          )}
          {status === "saved" && (
            <Check className="size-3.5 text-[var(--success)]" aria-label="Saved" />
          )}
        </span>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" aria-hidden />
          Add node
        </Button>

        <Button
          variant={meta.visibility === "link" ? "accent" : "outline"}
          size="sm"
          onClick={toggleShare}
        >
          {meta.visibility === "link" ? (
            <Link2 className="size-3.5" aria-hidden />
          ) : (
            <Lock className="size-3.5" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {meta.visibility === "link" ? "Shared" : "Share"}
          </span>
        </Button>

        <Button variant="danger" size="sm" onClick={removeSystem} aria-label="Delete system">
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </header>

      {/* --------------------------------------------------------- canvas */}
      <div id="system-canvas" className="relative min-h-[60vh] flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => setEditing(node as Node<TechniqueNodeData>)}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={EDGE_DEFAULTS}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: false }}
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-[var(--bg)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="rgba(255,255,255,0.07)"
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            className="hidden sm:block"
            maskColor="rgba(5,6,8,0.72)"
            nodeColor={() => "#1a1e26"}
          />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-sm rounded-[12px] border border-[var(--border)] bg-[var(--bg-elev-1)]/90 p-6 text-center backdrop-blur">
              <h2 className="font-display text-base tracking-wide text-[var(--fg)]">
                Empty canvas
              </h2>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                Add a starting position, then branch out with the techniques you hit
                from it. Drag from the dot under a node to connect it to the next one.
              </p>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Add your first node
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddNodeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        notes={notes}
        onAdd={addNode}
      />

      <EditNodeDialog
        node={editing}
        onClose={() => setEditing(null)}
        onSave={applyEdit}
        onDelete={deleteNode}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs */

const KINDS = [
  { value: "position", label: "Position", icon: Flag, hint: "Where you are" },
  { value: "technique", label: "Technique", icon: NotebookPen, hint: "What you do" },
  { value: "note", label: "Note", icon: StickyNote, hint: "A reminder" },
] as const;

function AddNodeDialog({
  open,
  onClose,
  notes,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  notes: NoteSummary[];
  onAdd: (data: Pick<TechniqueNodeData, "label" | "detail" | "kind" | "noteId">) => void;
}) {
  const [kind, setKind] = useState<TechniqueNodeData["kind"]>("technique");
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind("technique");
    setLabel("");
    setDetail("");
    setNoteId(null);
    setQuery("");
  }, [open]);

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const pick = (note: NoteSummary) => {
    setNoteId(note.id);
    setLabel(note.title);
    if (!detail) setDetail(note.summary);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add node"
      description="Link one of your techniques, or drop in a plain position marker."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!label.trim()}
            onClick={() =>
              onAdd({ label: label.trim(), detail: detail.trim(), kind, noteId })
            }
          >
            Add to canvas
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="label-hud mb-1.5">Node type</legend>
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map(({ value, label: l, icon: Icon, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setKind(value);
                  if (value !== "technique") setNoteId(null);
                }}
                aria-pressed={kind === value}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[8px] border px-2 py-2.5 text-xs transition-colors duration-200",
                  kind === value
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--fg)]"
                    : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {l}
                <span className="text-[0.625rem] text-[var(--fg-subtle)]">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {kind === "technique" && (
          <div>
            <Field label="Link a technique" hint="Optional — the node will open it.">
              {({ id }) => (
                <Input
                  id={id}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your techniques"
                />
              )}
            </Field>

            <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-[8px] border border-[var(--border)] p-1">
              {filtered.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-[var(--fg-subtle)]">
                  No matching techniques.
                </li>
              )}
              {filtered.slice(0, 40).map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => pick(note)}
                    aria-pressed={noteId === note.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-xs transition-colors",
                      noteId === note.id
                        ? "bg-[var(--primary-soft)] text-[var(--fg)]"
                        : "text-[var(--fg-muted)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]",
                    )}
                  >
                    {note.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={note.cover}
                        alt=""
                        className="size-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded border border-[var(--border)]">
                        <NotebookPen className="size-3" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{note.title}</span>
                    {noteId === note.id && (
                      <Check className="size-3.5 shrink-0 text-[var(--primary-hover)]" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Label" required>
          {({ id }) => (
            <Input
              id={id}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              placeholder="e.g. Hip bump sweep"
            />
          )}
        </Field>

        <Field label="Detail" hint="A short reminder shown on the node.">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={280}
              placeholder="When they posture up"
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

function EditNodeDialog({
  node,
  onClose,
  onSave,
  onDelete,
}: {
  node: Node<TechniqueNodeData> | null;
  onClose: () => void;
  onSave: (patch: Partial<TechniqueNodeData>) => void;
  onDelete: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!node) return;
    setLabel(node.data.label);
    setDetail(node.data.detail);
  }, [node]);

  return (
    <Modal
      open={Boolean(node)}
      onClose={onClose}
      title="Edit node"
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => node && onDelete(node.id)}
            className="mr-auto"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!label.trim()}
            onClick={() => onSave({ label: label.trim(), detail: detail.trim() })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Label" required>
          {({ id }) => (
            <Input
              id={id}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              autoFocus
            />
          )}
        </Field>
        <Field label="Detail">
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={280}
            />
          )}
        </Field>
        {node?.data.noteId && (
          <Link
            href={`/notes/${node.data.noteId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
          >
            Open the linked technique
          </Link>
        )}
      </div>
    </Modal>
  );
}
