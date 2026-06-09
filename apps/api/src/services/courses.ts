import { eq, desc } from "drizzle-orm";
import { CourseConfig, type CourseDTO } from "@studyforge/shared";
import { type DB, schema } from "../db/queries.js";
import type { CourseContext } from "../agent/prompt.js";

type CourseRow = typeof schema.courses.$inferSelect;

interface StoredConfig {
  tone_preset: string;
  citation_style: string;
  inclusion_enabled: boolean;
  role_model_enabled: boolean;
  session_count: number;
  session_durations: number[];
}

export async function createCourse(db: DB, userId: string, input: unknown): Promise<CourseDTO> {
  const cfg = CourseConfig.parse(input);
  const now = Date.now();
  const id = crypto.randomUUID();
  const stored: StoredConfig = {
    tone_preset: cfg.tone_preset,
    citation_style: cfg.citation_style,
    inclusion_enabled: cfg.inclusion_enabled,
    role_model_enabled: cfg.role_model_enabled,
    session_count: cfg.session_count,
    session_durations: cfg.session_durations,
  };
  await db.insert(schema.courses).values({
    id,
    userId,
    subject: cfg.subject,
    audience: cfg.audience,
    ageRange: cfg.age_range,
    language: cfg.language,
    roleTerm: cfg.role_term,
    config: JSON.stringify(stored),
    readyState: "draft",
    createdAt: now,
    updatedAt: now,
  });
  const row = (await db.select().from(schema.courses).where(eq(schema.courses.id, id)).limit(1))[0];
  return courseToDTO(row!);
}

export async function listCourses(db: DB, userId: string): Promise<CourseDTO[]> {
  const rows = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.userId, userId))
    .orderBy(desc(schema.courses.updatedAt));
  return rows.map(courseToDTO);
}

export function courseToDTO(row: CourseRow): CourseDTO {
  const cfg = JSON.parse(row.config) as StoredConfig;
  return {
    id: row.id,
    user_id: row.userId,
    subject: row.subject,
    audience: row.audience,
    age_range: row.ageRange,
    language: row.language,
    role_term: row.roleTerm,
    tone_preset: cfg.tone_preset,
    citation_style: cfg.citation_style,
    inclusion_enabled: cfg.inclusion_enabled,
    role_model_enabled: cfg.role_model_enabled,
    session_count: cfg.session_count,
    session_durations: cfg.session_durations,
    ready_state: row.readyState as CourseDTO["ready_state"],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function courseContext(row: CourseRow): CourseContext {
  const cfg = JSON.parse(row.config) as StoredConfig;
  return {
    subject: row.subject,
    audience: row.audience,
    ageRange: row.ageRange,
    language: row.language,
    roleTerm: row.roleTerm,
    tonePreset: cfg.tone_preset,
    citationStyle: cfg.citation_style,
    inclusionEnabled: cfg.inclusion_enabled,
    roleModelEnabled: cfg.role_model_enabled,
    sessionCount: cfg.session_count,
    sessionDurations: cfg.session_durations,
  };
}
