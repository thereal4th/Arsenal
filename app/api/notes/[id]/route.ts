import { ApiError, ok, readJson, requireUserId, route, toObjectId } from "@/lib/api";
import { notes } from "@/lib/db";
import { serializeNote } from "@/lib/types";
import { noteUpdateSchema } from "@/lib/validation";
import { shareToken } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;

  const collection = await notes();
  const doc = await collection.findOne({ _id: toObjectId(id), userId });
  if (!doc) throw new ApiError(404, "That technique no longer exists.");

  return ok({ note: serializeNote(doc) });
});

export const PATCH = route(async (request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;
  const patch = noteUpdateSchema.parse(await readJson(request));

  const collection = await notes();
  const _id = toObjectId(id);
  const existing = await collection.findOne({ _id, userId });
  if (!existing) throw new ApiError(404, "That technique no longer exists.");

  const update: Record<string, unknown> = { ...patch, updatedAt: new Date() };

  // Publishing mints a token once; unpublishing revokes it so old links die.
  if (patch.visibility === "link" && !existing.shareToken) {
    update.shareToken = shareToken();
  } else if (patch.visibility === "private") {
    update.shareToken = null;
  }

  await collection.updateOne({ _id, userId }, { $set: update });
  const doc = await collection.findOne({ _id, userId });

  return ok({ note: serializeNote(doc!) });
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;

  const collection = await notes();
  const result = await collection.deleteOne({ _id: toObjectId(id), userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "That technique no longer exists.");
  }

  return ok({ deleted: true });
});
