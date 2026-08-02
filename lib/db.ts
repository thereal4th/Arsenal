import { MongoClient, type Db, type Collection, type ObjectId } from "mongodb";
import type { SceneJSON } from "@/lib/mannequin/pose";

/* ========================================================================== */
/* Documents                                                                  */
/* ========================================================================== */

export type Visibility = "private" | "link";

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  belt?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** One captured mannequin position embedded in a technique note. */
export interface FrameDoc {
  id: string;
  caption: string;
  /** Full pose data — everything needed to reopen this frame in the editor. */
  scene: SceneJSON;
  /** PNG data URL rendered from the viewport at capture time. */
  thumbnail: string;
}

export interface NoteDoc {
  _id?: ObjectId;
  userId: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  /** Markdown-ish rich text. */
  body: string;
  frames: FrameDoc[];
  visibility: Visibility;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemNodeDoc {
  id: string;
  /** Linked technique note, when the node represents one. */
  noteId: string | null;
  kind: "technique" | "position" | "note";
  label: string;
  detail: string;
  position: { x: number; y: number };
}

export interface SystemEdgeDoc {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface SystemDoc {
  _id?: ObjectId;
  userId: string;
  title: string;
  description: string;
  nodes: SystemNodeDoc[];
  edges: SystemEdgeDoc[];
  visibility: Visibility;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresetDoc {
  _id?: ObjectId;
  userId: string;
  name: string;
  /** Unique per user — this is what makes "save over an existing name" work. */
  slug: string;
  category: string;
  description: string;
  scene: SceneJSON;
  thumbnail: string | null;
  visibility: Visibility;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ========================================================================== */
/* Connection                                                                 */
/* ========================================================================== */

const uri = process.env.MONGODB_CONNECTION_STRING;
const dbName = process.env.MONGODB_DB || "arsenal";

/**
 * Thrown when the app is running without a configured database. The UI catches
 * this and shows a setup notice instead of a stack trace, so the project can be
 * cloned and explored before Mongo is provisioned.
 */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "MONGODB_CONNECTION_STRING is not set. Add it to .env to enable accounts, notes and systems.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export const isDatabaseConfigured = () => Boolean(uri);

// The client is cached on globalThis so hot reloads in development reuse a
// single connection pool rather than exhausting the server with new ones.
declare global {
  // eslint-disable-next-line no-var
  var _arsenalMongo: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!uri) throw new DatabaseNotConfiguredError();

  if (process.env.NODE_ENV === "development") {
    if (!global._arsenalMongo) {
      global._arsenalMongo = new MongoClient(uri).connect();
    }
    return global._arsenalMongo;
  }

  if (!cachedProdClient) cachedProdClient = new MongoClient(uri).connect();
  return cachedProdClient;
}

let cachedProdClient: Promise<MongoClient> | undefined;

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(dbName);
}

/* ========================================================================== */
/* Collections                                                                */
/* ========================================================================== */

export async function users(): Promise<Collection<UserDoc>> {
  return (await getDb()).collection<UserDoc>("users");
}

export async function notes(): Promise<Collection<NoteDoc>> {
  return (await getDb()).collection<NoteDoc>("notes");
}

export async function systems(): Promise<Collection<SystemDoc>> {
  return (await getDb()).collection<SystemDoc>("systems");
}

export async function presets(): Promise<Collection<PresetDoc>> {
  return (await getDb()).collection<PresetDoc>("presets");
}

/* ========================================================================== */
/* Indexes                                                                    */
/* ========================================================================== */

let indexesReady: Promise<void> | null = null;

/**
 * Create indexes once per process. Called lazily from the data helpers so the
 * app never needs a separate migration step.
 */
export function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const [u, n, s, p] = await Promise.all([users(), notes(), systems(), presets()]);
      await Promise.all([
        u.createIndex({ email: 1 }, { unique: true }),
        n.createIndex({ userId: 1, updatedAt: -1 }),
        n.createIndex({ shareToken: 1 }, { sparse: true }),
        n.createIndex({ userId: 1, title: "text", summary: "text", tags: "text" }),
        s.createIndex({ userId: 1, updatedAt: -1 }),
        s.createIndex({ shareToken: 1 }, { sparse: true }),
        // Per-user unique slug: saving a preset under an existing name overwrites it.
        p.createIndex({ userId: 1, slug: 1 }, { unique: true }),
        p.createIndex({ shareToken: 1 }, { sparse: true }),
      ]);
    })().catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
}
