import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { DatabaseNotConfiguredError, ensureIndexes } from "@/lib/db";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Resolve the signed-in user id or reject the request. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "You need to be signed in.");
  await ensureIndexes();
  return id;
}

/** Parse a path parameter into an ObjectId, rejecting malformed input. */
export function toObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) throw new ApiError(404, "Not found.");
  return new ObjectId(value);
}

/**
 * Wrap a route handler so every failure becomes a predictable JSON envelope
 * instead of a leaked stack trace.
 */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse | Response>,
) {
  return async (...args: Args): Promise<NextResponse | Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Some fields need attention.", details: flattenZod(error) },
          { status: 422 },
        );
      }
      if (error instanceof DatabaseNotConfiguredError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      console.error("[api]", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  };
}

export function flattenZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Read and parse a JSON body, rejecting anything that is not an object. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Expected a JSON body.");
  }
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
