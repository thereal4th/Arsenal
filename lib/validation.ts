import { z } from "zod";
import { SCENE_VERSION } from "@/lib/mannequin/pose";

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email is required")
  .max(160)
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "That password is too long")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Include at least one letter and one number",
  });

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  email: emailSchema,
  password: passwordSchema,
  belt: z.string().trim().max(30).optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const sceneSchema = z.object({
  v: z.literal(SCENE_VERSION),
  figures: z
    .array(
      z.object({
        id: z.string().max(8),
        label: z.string().max(40),
        role: z.enum(["ally", "opponent"]),
        position: vec3,
        rotation: vec3,
        scale: z.number().min(0.7).max(1.4),
        joints: z.record(z.string(), vec3),
      }),
    )
    .min(1)
    .max(2),
  camera: z.object({ position: vec3, target: vec3 }),
});

/** A rendered PNG data URL, size-capped so a note can't blow past Mongo limits. */
const thumbnailSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,/, "Unsupported image format")
  .max(3_000_000, "Image is too large");

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

export const frameSchema = z.object({
  id: z.string().max(64),
  caption: z.string().trim().max(240),
  scene: sceneSchema,
  thumbnail: thumbnailSchema,
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Give the technique a name").max(120),
  summary: z.string().trim().max(400).default(""),
  category: z.string().trim().max(60).default("Uncategorised"),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  body: z.string().max(60_000).default(""),
  frames: z.array(frameSchema).max(24).default([]),
  visibility: z.enum(["private", "link"]).default("private"),
});

export const noteUpdateSchema = noteSchema.partial();

/* -------------------------------------------------------------------------- */
/* Systems                                                                    */
/* -------------------------------------------------------------------------- */

export const systemNodeSchema = z.object({
  id: z.string().max(64),
  noteId: z.string().max(64).nullable().default(null),
  kind: z.enum(["technique", "position", "note"]).default("technique"),
  label: z.string().trim().min(1).max(80),
  detail: z.string().trim().max(240).default(""),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const systemEdgeSchema = z.object({
  id: z.string().max(64),
  source: z.string().max(64),
  target: z.string().max(64),
  label: z.string().trim().max(60).default(""),
});

export const systemSchema = z.object({
  title: z.string().trim().min(1, "Name the system").max(120),
  description: z.string().trim().max(600).default(""),
  nodes: z.array(systemNodeSchema).max(200).default([]),
  edges: z.array(systemEdgeSchema).max(400).default([]),
  visibility: z.enum(["private", "link"]).default("private"),
});

export const systemUpdateSchema = systemSchema.partial();

/* -------------------------------------------------------------------------- */
/* Presets                                                                    */
/* -------------------------------------------------------------------------- */

export const presetSchema = z.object({
  name: z.string().trim().min(1, "Name the preset").max(60),
  category: z.string().trim().max(40).default("Custom"),
  description: z.string().trim().max(240).default(""),
  scene: sceneSchema,
  thumbnail: thumbnailSchema.nullable().default(null),
  visibility: z.enum(["private", "link"]).default("private"),
  /**
   * When false the request fails instead of replacing an existing preset with
   * the same name, so the UI can prompt the user before clobbering their work.
   */
  overwrite: z.boolean().default(true),
});

export type SceneInput = z.infer<typeof sceneSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type SystemInput = z.infer<typeof systemSchema>;
export type PresetInput = z.infer<typeof presetSchema>;
