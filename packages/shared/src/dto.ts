import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (constitution: configurable, schema-validated)
// ---------------------------------------------------------------------------

export const ReadyState = z.enum(["draft", "interviewing", "awaiting_approval", "ready"]);
export type ReadyState = z.infer<typeof ReadyState>;

export const DocumentType = z.enum(["course_requirements", "main_plan"]);
export type DocumentType = z.infer<typeof DocumentType>;

export const DocumentStatus = z.enum(["draft", "needs_review", "approved"]);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const DocumentOrigin = z.enum(["agent", "manual"]);
export type DocumentOrigin = z.infer<typeof DocumentOrigin>;

export const InterviewStatus = z.enum(["in_progress", "complete"]);
export type InterviewStatus = z.infer<typeof InterviewStatus>;

/** Bloom's revised taxonomy cognitive levels. */
export const BloomLevel = z.enum([
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
]);
export type BloomLevel = z.infer<typeof BloomLevel>;

export const MissingInfoResolution = z.enum(["assumption", "default", "pending"]);
export type MissingInfoResolution = z.infer<typeof MissingInfoResolution>;

// ---------------------------------------------------------------------------
// Course configuration (per-course; nothing hardcoded — Principle IX)
// ---------------------------------------------------------------------------

export const CourseConfig = z.object({
  subject: z.string().min(1),
  audience: z.string().min(1),
  age_range: z.string().min(1),
  /** ISO-ish language code or name; all generated content uses this. */
  language: z.string().min(1),
  /** e.g. "teacher", "mentora" — configurable. */
  role_term: z.string().min(1).default("teacher"),
  tone_preset: z.string().default("clear-and-supportive"),
  citation_style: z.string().default("APA7"),
  inclusion_enabled: z.boolean().default(false),
  role_model_enabled: z.boolean().default(false),
  session_count: z.number().int().positive(),
  /** Minutes per session, indexed to session order (or a single value reused). */
  session_durations: z.array(z.number().int().positive()).min(1),
});
export type CourseConfig = z.infer<typeof CourseConfig>;

// ---------------------------------------------------------------------------
// DTOs surfaced over the API
// ---------------------------------------------------------------------------

export const CourseDTO = CourseConfig.extend({
  id: z.string(),
  user_id: z.string(),
  ready_state: ReadyState,
  created_at: z.number(),
  updated_at: z.number(),
});
export type CourseDTO = z.infer<typeof CourseDTO>;

export const DocumentDTO = z.object({
  id: z.string(),
  course_id: z.string(),
  type: DocumentType,
  version: z.number().int().positive(),
  status: DocumentStatus,
  origin: DocumentOrigin,
  content: z.unknown(),
  review_flags: z.array(z.string()).nullable(),
  created_at: z.number(),
});
export type DocumentDTO = z.infer<typeof DocumentDTO>;

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
