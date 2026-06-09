import { Hono, type Context } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppContext } from "../env.js";
import { db, schema, getOwnedCourse, getLatestDocument } from "../db/queries.js";
import { notFound, conflict, unprocessable } from "../http.js";
import { generatorByName } from "../agent/registry.js";
import type { ChatMessage } from "../agent/openrouter.js";
import {
  persistVersion,
  toDocumentDTO,
  approveCourse,
  isComplete,
} from "../services/documents.js";
import { runAgentStream } from "./_run.js";

const r = new Hono<AppContext>();

const TYPE_PARAM: Record<string, "course_requirements" | "main_plan"> = {
  "course-requirements": "course_requirements",
  "main-plan": "main_plan",
};

function docType(param: string | undefined): "course_requirements" | "main_plan" {
  const t = param ? TYPE_PARAM[param] : undefined;
  if (!t) throw notFound("Unknown document type");
  return t;
}

async function ownedCourse(c: Context<AppContext>) {
  const course = await getOwnedCourse(db(c.env.DB), c.req.param("id"), c.get("userId"));
  if (!course) throw notFound("Course not found");
  return course;
}

// --- Generate (SSE) — both types; main_plan requires complete requirements ---
r.post("/:id/documents/:type/generate", async (c) => {
  const course = await ownedCourse(c);
  const type = docType(c.req.param("type"));
  const database = db(c.env.DB);
  const guidance = (await c.req.json().catch(() => ({})))?.guidance as string | undefined;

  const generator = generatorByName(type === "main_plan" ? "main-plan" : "course-requirements")!;
  const history: ChatMessage[] = [];

  if (type === "main_plan") {
    const req = await getLatestDocument(database, course.id, "course_requirements");
    if (!isComplete(req)) {
      throw conflict("INCOMPLETE_REQUIREMENTS", "A complete course-requirements is required first.");
    }
    history.push({
      role: "user",
      content:
        "Generate the main-plan from these approved course-requirements:\n\n" +
        req!.content +
        (guidance ? `\n\nAdditional guidance: ${guidance}` : ""),
    });
  } else {
    history.push({
      role: "user",
      content:
        "Produce the course-requirements document." +
        (guidance ? ` Guidance: ${guidance}` : ""),
    });
  }

  return runAgentStream(c, {
    course,
    phaseInstructions: generator.instructions,
    generators: [generator],
    history,
  });
});

// --- Read latest / versions ---
r.get("/:id/documents/:type", async (c) => {
  const course = await ownedCourse(c);
  const type = docType(c.req.param("type"));
  const row = await getLatestDocument(db(c.env.DB), course.id, type);
  if (!row) throw notFound("No document of this type yet");
  return c.json({ document: toDocumentDTO(row) });
});

r.get("/:id/documents/:type/versions", async (c) => {
  const course = await ownedCourse(c);
  const type = docType(c.req.param("type"));
  const rows = await db(c.env.DB)
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.courseId, course.id), eq(schema.documents.type, type)))
    .orderBy(desc(schema.documents.version));
  return c.json({
    versions: rows.map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      origin: row.origin,
      created_at: row.createdAt,
    })),
  });
});

r.get("/:id/documents/:type/versions/:v", async (c) => {
  const course = await ownedCourse(c);
  const type = docType(c.req.param("type"));
  const v = Number(c.req.param("v"));
  const row = (
    await db(c.env.DB)
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.courseId, course.id),
          eq(schema.documents.type, type),
          eq(schema.documents.version, v),
        ),
      )
      .limit(1)
  )[0];
  if (!row) throw notFound("Version not found");
  return c.json({ document: toDocumentDTO(row) });
});

// --- Manual edit → new version (validated; FR-017a) ---
r.put("/:id/documents/:type", async (c) => {
  const course = await ownedCourse(c);
  const type = docType(c.req.param("type"));
  const body = z.object({ content: z.unknown() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) throw unprocessable("A `content` object is required", body.error.issues);
  const generator = generatorByName(type === "main_plan" ? "main-plan" : "course-requirements")!;
  const doc = await persistVersion(db(c.env.DB), {
    courseId: course.id,
    type,
    origin: "manual",
    content: body.data.content,
    contentSchema: generator.schema,
  });
  return c.json({ document: doc });
});

// --- Approve both latest documents (FR-016) ---
r.post("/:id/approve", async (c) => {
  const course = await ownedCourse(c);
  const readiness = await approveCourse(db(c.env.DB), course.id);
  return c.json({ readiness });
});

export default r;
