import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { DocumentDTO } from "@studyforge/shared";
import { type DB, schema, getLatestDocument, nextVersion } from "../db/queries.js";
import { conflict } from "../http.js";
import { runQualityGate } from "./quality.js";

type DocRow = typeof schema.documents.$inferSelect;

export function toDocumentDTO(row: DocRow): DocumentDTO {
  return {
    id: row.id,
    course_id: row.courseId,
    type: row.type as DocumentDTO["type"],
    version: row.version,
    status: row.status as DocumentDTO["status"],
    origin: row.origin as DocumentDTO["origin"],
    content: JSON.parse(row.content),
    review_flags: row.reviewFlags ? (JSON.parse(row.reviewFlags) as string[]) : null,
    created_at: row.createdAt,
  };
}

/**
 * Persist a new document version (FR-017): runs the quality gate, sets status
 * (`draft` when it passes, `needs_review` + flags when it fails — FR-018), then
 * recomputes course readiness (a new version revokes approval — FR-016a).
 */
export async function persistVersion(
  db: DB,
  args: {
    courseId: string;
    type: "course_requirements" | "main_plan";
    origin: "agent" | "manual";
    content: unknown;
    contentSchema: z.ZodTypeAny;
  },
): Promise<DocumentDTO> {
  const gate = runQualityGate(args.contentSchema, args.content);
  const status = gate.ok ? "draft" : "needs_review";
  const version = await nextVersion(db, args.courseId, args.type);
  const id = crypto.randomUUID();
  await db.insert(schema.documents).values({
    id,
    courseId: args.courseId,
    type: args.type,
    version,
    status,
    origin: args.origin,
    content: JSON.stringify(args.content),
    reviewFlags: gate.ok ? null : JSON.stringify(gate.flags),
    createdAt: Date.now(),
  });
  await recomputeReadiness(db, args.courseId);
  const row = await getLatestDocument(db, args.courseId, args.type);
  return toDocumentDTO(row!);
}

/** A course_requirements is "complete" when its latest version is not needs_review. */
export function isComplete(row: DocRow | undefined): boolean {
  return !!row && row.status !== "needs_review";
}

/** Derive and persist the course readiness state (data-model state machine). */
export async function recomputeReadiness(db: DB, courseId: string): Promise<string> {
  const req = await getLatestDocument(db, courseId, "course_requirements");
  const plan = await getLatestDocument(db, courseId, "main_plan");
  let state: string;
  if (req && plan && req.status === "approved" && plan.status === "approved") {
    state = "ready";
  } else if (req && plan) {
    state = "awaiting_approval";
  } else if (req) {
    state = "interviewing";
  } else {
    state = "draft";
  }
  await db
    .update(schema.courses)
    .set({ readyState: state, updatedAt: Date.now() })
    .where(eq(schema.courses.id, courseId));
  return state;
}

/**
 * Approve the latest requirements + main-plan atomically (FR-016). 409 if either
 * is missing or in needs_review. Returns the resulting readiness ("ready").
 */
export async function approveCourse(db: DB, courseId: string): Promise<string> {
  const req = await getLatestDocument(db, courseId, "course_requirements");
  const plan = await getLatestDocument(db, courseId, "main_plan");
  if (!req || !plan) {
    throw conflict("INCOMPLETE", "Both course-requirements and main-plan must exist to approve.");
  }
  if (req.status === "needs_review" || plan.status === "needs_review") {
    throw conflict("NEEDS_REVIEW", "A document needs review and cannot be approved.");
  }
  for (const row of [req, plan]) {
    await db
      .update(schema.documents)
      .set({ status: "approved" })
      .where(and(eq(schema.documents.id, row.id)));
  }
  return recomputeReadiness(db, courseId);
}
