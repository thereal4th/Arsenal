import bcrypt from "bcryptjs";
import { ApiError, ok, readJson, route } from "@/lib/api";
import { ensureIndexes, isDatabaseConfigured, users } from "@/lib/db";
import { signUpSchema } from "@/lib/validation";

export const POST = route(async (request: Request) => {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      "The database is not configured yet. Add MONGODB_CONNECTION_STRING to .env.",
    );
  }

  const body = signUpSchema.parse(await readJson(request));

  await ensureIndexes();
  const collection = await users();

  const existing = await collection.findOne({ email: body.email });
  if (existing) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(body.password, 12);

  try {
    await collection.insertOne({
      email: body.email,
      name: body.name,
      passwordHash,
      belt: body.belt,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    // Unique index race: another request created the account first.
    if ((error as { code?: number }).code === 11000) {
      throw new ApiError(409, "An account with that email already exists.");
    }
    throw error;
  }

  return ok({ created: true }, 201);
});
