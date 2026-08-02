import { ApiError, ok, readJson, requireUserId, route, toObjectId } from "@/lib/api";
import { presets } from "@/lib/db";
import { serializePreset } from "@/lib/types";
import { shareToken } from "@/lib/utils";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  visibility: z.enum(["private", "link"]).optional(),
  description: z.string().trim().max(240).optional(),
  category: z.string().trim().max(40).optional(),
});

export const PATCH = route(async (request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;
  const patch = patchSchema.parse(await readJson(request));

  const collection = await presets();
  const _id = toObjectId(id);
  const existing = await collection.findOne({ _id, userId });
  if (!existing) throw new ApiError(404, "That preset no longer exists.");

  const update: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (patch.visibility === "link" && !existing.shareToken) {
    update.shareToken = shareToken();
  } else if (patch.visibility === "private") {
    update.shareToken = null;
  }

  await collection.updateOne({ _id, userId }, { $set: update });
  const doc = await collection.findOne({ _id, userId });

  return ok({ preset: serializePreset(doc!) });
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const userId = await requireUserId();
  const { id } = await context.params;

  const collection = await presets();
  const result = await collection.deleteOne({ _id: toObjectId(id), userId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, "That preset no longer exists.");
  }

  return ok({ deleted: true });
});
