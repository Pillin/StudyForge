import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, desc, eq, max } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema.js";

export type DB = DrizzleD1Database<typeof schema>;

export function db(d1: D1Database): DB {
  return drizzle(d1, { schema });
}

/** A course, scoped to its owner (returns undefined if not owned — FR-002). */
export async function getOwnedCourse(db: DB, courseId: string | undefined, userId: string) {
  if (!courseId) return undefined;
  const rows = await db
    .select()
    .from(schema.courses)
    .where(and(eq(schema.courses.id, courseId), eq(schema.courses.userId, userId)))
    .limit(1);
  return rows[0];
}

/** Latest version row for a (course, type), or undefined. */
export async function getLatestDocument(
  db: DB,
  courseId: string,
  type: string,
) {
  const rows = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.courseId, courseId), eq(schema.documents.type, type)))
    .orderBy(desc(schema.documents.version))
    .limit(1);
  return rows[0];
}

/** Next version number for a (course, type). */
export async function nextVersion(db: DB, courseId: string, type: string): Promise<number> {
  const rows = await db
    .select({ v: max(schema.documents.version) })
    .from(schema.documents)
    .where(and(eq(schema.documents.courseId, courseId), eq(schema.documents.type, type)));
  return (rows[0]?.v ?? 0) + 1;
}

export { schema };
