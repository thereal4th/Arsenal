import { ApiError, ok, readJson, requireUserId, route } from "@/lib/api";
import { systems } from "@/lib/db";
import { serializeSystem, serializeSystemSummary } from "@/lib/types";
import { systemSchema } from "@/lib/validation";
import { shareToken } from "@/lib/utils";

export const GET = route(async () => {
  const userId = await requireUserId();

  const collection = await systems();
  const docs = await collection
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();

  return ok({ systems: docs.map(serializeSystemSummary) });
});

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body = systemSchema.parse(await readJson(request));

  const now = new Date();
  const collection = await systems();
  const result = await collection.insertOne({
    userId,
    ...body,
    shareToken: body.visibility === "link" ? shareToken() : null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) throw new ApiError(500, "The system could not be saved.");

  return ok({ system: serializeSystem(created) }, 201);
});
