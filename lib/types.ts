import type { WithId } from "mongodb";
import type {
  FrameDoc,
  NoteDoc,
  PresetDoc,
  SystemDoc,
  SystemEdgeDoc,
  SystemNodeDoc,
  Visibility,
} from "@/lib/db";
import type { SceneJSON } from "@/lib/mannequin/pose";

/* -------------------------------------------------------------------------- */
/* Client-facing shapes                                                       */
/* -------------------------------------------------------------------------- */

export interface Frame {
  id: string;
  caption: string;
  scene: SceneJSON;
  thumbnail: string;
}

export interface Note {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  body: string;
  frames: Frame[];
  visibility: Visibility;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight note shape for lists — omits bodies and frame payloads. */
export interface NoteSummary {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  frameCount: number;
  cover: string | null;
  visibility: Visibility;
  shareToken: string | null;
  updatedAt: string;
}

export interface SystemGraph {
  id: string;
  title: string;
  description: string;
  nodes: SystemNodeDoc[];
  edges: SystemEdgeDoc[];
  visibility: Visibility;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSummary {
  id: string;
  title: string;
  description: string;
  nodeCount: number;
  edgeCount: number;
  visibility: Visibility;
  shareToken: string | null;
  updatedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  scene: SceneJSON;
  thumbnail: string | null;
  visibility: Visibility;
  shareToken: string | null;
  isDefault: false;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Serialisers                                                                */
/* -------------------------------------------------------------------------- */

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : d);

export function serializeFrame(frame: FrameDoc): Frame {
  return {
    id: frame.id,
    caption: frame.caption,
    scene: frame.scene,
    thumbnail: frame.thumbnail,
  };
}

export function serializeNote(doc: WithId<NoteDoc>): Note {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    summary: doc.summary,
    category: doc.category,
    tags: doc.tags ?? [],
    body: doc.body ?? "",
    frames: (doc.frames ?? []).map(serializeFrame),
    visibility: doc.visibility,
    shareToken: doc.shareToken ?? null,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export function serializeNoteSummary(doc: WithId<NoteDoc>): NoteSummary {
  const frames = doc.frames ?? [];
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    summary: doc.summary,
    category: doc.category,
    tags: doc.tags ?? [],
    frameCount: frames.length,
    cover: frames[0]?.thumbnail ?? null,
    visibility: doc.visibility,
    shareToken: doc.shareToken ?? null,
    updatedAt: iso(doc.updatedAt),
  };
}

export function serializeSystem(doc: WithId<SystemDoc>): SystemGraph {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description ?? "",
    nodes: doc.nodes ?? [],
    edges: doc.edges ?? [],
    visibility: doc.visibility,
    shareToken: doc.shareToken ?? null,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export function serializeSystemSummary(doc: WithId<SystemDoc>): SystemSummary {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description ?? "",
    nodeCount: (doc.nodes ?? []).length,
    edgeCount: (doc.edges ?? []).length,
    visibility: doc.visibility,
    shareToken: doc.shareToken ?? null,
    updatedAt: iso(doc.updatedAt),
  };
}

export function serializePreset(doc: WithId<PresetDoc>): Preset {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    category: doc.category,
    description: doc.description ?? "",
    scene: doc.scene,
    thumbnail: doc.thumbnail ?? null,
    visibility: doc.visibility,
    shareToken: doc.shareToken ?? null,
    isDefault: false,
    updatedAt: iso(doc.updatedAt),
  };
}
