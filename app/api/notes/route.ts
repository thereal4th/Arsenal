import { ApiError, ok, readJson, requireUserId, route } from "@/lib/api";
import { notes } from "@/lib/db";
import { serializeNote, serializeNoteSummary } from "@/lib/types";
import { noteSchema } from "@/lib/validation";
import { shareToken } from "@/lib/utils";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category")?.trim();

  const filter: Record<string, unknown> = { userId };
  if (category && category !== "all") filter.category = category;
  if (q) {
    // Escaped so a user searching for "(" cannot break the query.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { summary: { $regex: safe, $options: "i" } },
      { tags: { $regex: safe, $options: "i" } },
    ];
  }

  const collection = await notes();
  const docs = await collection
    .find(filter)
    .project({ body: 0, "frames.scene": 0 })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();

  return ok({
    notes: docs.map((d) => serializeNoteSummary(d as never)),
  });
});

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body = noteSchema.parse(await readJson(request));

  const now = new Date();
  const collection = await notes();
  const result = await collection.insertOne({
    userId,
    ...body,
    shareToken: body.visibility === "link" ? shareToken() : null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) throw new ApiError(500, "The note could not be saved.");

  return ok({ note: serializeNote(created) }, 201);
});
