import { ApiError, ok, readJson, requireUserId, route, toObjectId } from "@/lib/api";
import { systems } from "@/lib/db";
import { serializeSystem } from "@/lib/types";
import { systemUpdateSchema } from "@/lib/validation";
import { shareToken } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;

  const collection = await systems();
  const doc = await collection.findOne({ _id: toObjectId(id), userId });
  if (!doc) throw new ApiError(404, "That system no longer exists.");

  return ok({ system: serializeSystem(doc) });
});

export const PATCH = route(async (request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;
  const patch = systemUpdateSchema.parse(await readJson(request));

  const collection = await systems();
  const _id = toObjectId(id);
  const existing = await collection.findOne({ _id, userId });
  if (!existing) throw new ApiError(404, "That system no longer exists.");

  const update: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (patch.visibility === "link" && !existing.shareToken) {
    update.shareToken = shareToken();
  } else if (patch.visibility === "private") {
    update.shareToken = null;
  }

  await collection.updateOne({ _id, userId }, { $set: update });
  const doc = await collection.findOne({ _id, userId });

  return ok({ system: serializeSystem(doc!) });
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;

  const collection = await systems();
  const result = await collection.deleteOne({ _id: toObjectId(id), userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "That system no longer exists.");
  }

  return ok({ deleted: true });
});
