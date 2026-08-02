import { ApiError, ok, readJson, requireUserId, route } from "@/lib/api";
import { presets } from "@/lib/db";
import { isDefaultPreset } from "@/lib/mannequin/presets";
import { serializePreset } from "@/lib/types";
import { presetSchema } from "@/lib/validation";
import { shareToken, slugify } from "@/lib/utils";

export const GET = route(async () => {
  const userId = await requireUserId();

  const collection = await presets();
  const docs = await collection.find({ userId }).sort({ updatedAt: -1 }).toArray();

  return ok({ presets: docs.map(serializePreset) });
});

/**
 * Save a preset.
 *
 * Naming rules the editor depends on:
 *  - A new name creates a new preset.
 *  - An existing name belonging to this user overwrites that preset.
 *  - A name that collides with a built-in preset is rejected, because the
 *    default library must stay immutable.
 */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body = presetSchema.parse(await readJson(request));

  const slug = slugify(body.name);
  if (!slug) throw new ApiError(422, "That name cannot be used.");

  if (isDefaultPreset(slug)) {
    throw new ApiError(
      409,
      `"${body.name}" is a built-in position and cannot be overwritten. Choose another name.`,
    );
  }

  const collection = await presets();
  const existing = await collection.findOne({ userId, slug });

  if (existing && !body.overwrite) {
    throw new ApiError(409, `You already have a preset called "${body.name}".`, {
      conflict: true,
      slug,
    });
  }

  const now = new Date();
  await collection.updateOne(
    { userId, slug },
    {
      $set: {
        name: body.name,
        category: body.category,
        description: body.description,
        scene: body.scene,
        thumbnail: body.thumbnail,
        visibility: body.visibility,
        shareToken:
          body.visibility === "link"
            ? (existing?.shareToken ?? shareToken())
            : null,
        updatedAt: now,
      },
      $setOnInsert: { userId, slug, createdAt: now },
    },
    { upsert: true },
  );

  const doc = await collection.findOne({ userId, slug });
  if (!doc) throw new ApiError(500, "The preset could not be saved.");

  return ok(
    { preset: serializePreset(doc), overwritten: Boolean(existing) },
    existing ? 200 : 201,
  );
});
