import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import {
  ensureIndexes,
  isDatabaseConfigured,
  notes,
  presets,
  systems,
} from "@/lib/db";
import {
  serializeNote,
  serializeNoteSummary,
  serializeSystem,
  serializeSystemSummary,
  type Note,
  type NoteSummary,
  type SystemGraph,
  type SystemSummary,
} from "@/lib/types";

/**
 * Server-side loaders used by pages. Each returns an empty result rather than
 * throwing when the database is not yet configured, so the app stays navigable
 * before MONGODB_CONNECTION_STRING is filled in.
 */

export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function ready(): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  await ensureIndexes();
  return userId;
}

export async function listNotes(): Promise<NoteSummary[]> {
  const userId = await ready();
  if (!userId) return [];

  const collection = await notes();
  const docs = await collection
    .find({ userId })
    .project({ body: 0, "frames.scene": 0 })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();

  return docs.map((d) => serializeNoteSummary(d as never));
}

export async function getNote(id: string): Promise<Note | null> {
  const userId = await ready();
  if (!userId || !ObjectId.isValid(id)) return null;

  const collection = await notes();
  const doc = await collection.findOne({ _id: new ObjectId(id), userId });
  return doc ? serializeNote(doc) : null;
}

export async function listSystems(): Promise<SystemSummary[]> {
  const userId = await ready();
  if (!userId) return [];

  const collection = await systems();
  const docs = await collection
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();

  return docs.map(serializeSystemSummary);
}

export async function getSystem(id: string): Promise<SystemGraph | null> {
  const userId = await ready();
  if (!userId || !ObjectId.isValid(id)) return null;

  const collection = await systems();
  const doc = await collection.findOne({ _id: new ObjectId(id), userId });
  return doc ? serializeSystem(doc) : null;
}

export async function countPresets(): Promise<number> {
  const userId = await ready();
  if (!userId) return 0;
  const collection = await presets();
  return collection.countDocuments({ userId });
}

/* -------------------------------------------------------------------------- */
/* Public (share link) lookups — deliberately do not require a session.        */
/* -------------------------------------------------------------------------- */

export async function getSharedNote(token: string): Promise<Note | null> {
  if (!isDatabaseConfigured() || !token) return null;
  const collection = await notes();
  const doc = await collection.findOne({ shareToken: token, visibility: "link" });
  return doc ? serializeNote(doc) : null;
}

export async function getSharedSystem(token: string): Promise<SystemGraph | null> {
  if (!isDatabaseConfigured() || !token) return null;
  const collection = await systems();
  const doc = await collection.findOne({ shareToken: token, visibility: "link" });
  return doc ? serializeSystem(doc) : null;
}

export async function getSharedPreset(token: string) {
  if (!isDatabaseConfigured() || !token) return null;
  const collection = await presets();
  const doc = await collection.findOne({ shareToken: token, visibility: "link" });
  if (!doc) return null;
  return {
    name: doc.name,
    description: doc.description,
    category: doc.category,
    scene: doc.scene,
    thumbnail: doc.thumbnail,
  };
}
