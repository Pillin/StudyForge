import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AppContext } from "../env.js";
import { db, schema, getOwnedCourse } from "../db/queries.js";
import { notFound, unprocessable } from "../http.js";
import { INTERVIEW_INSTRUCTIONS, generatorByName } from "../agent/registry.js";
import type { ChatMessage } from "../agent/openrouter.js";
import { REQUIRED_TOPICS } from "../skills/interview/topics.js";
import { runAgentStream } from "./_run.js";

const r = new Hono<AppContext>();

interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

async function getOrCreateInterview(database: ReturnType<typeof db>, courseId: string) {
  const existing = (
    await database
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.courseId, courseId))
      .limit(1)
  )[0];
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = Date.now();
  await database.insert(schema.interviewSessions).values({
    id,
    courseId,
    transcript: "[]",
    coverage: JSON.stringify({ covered: [], missing: [...REQUIRED_TOPICS] }),
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  });
  return (
    await database
      .select()
      .from(schema.interviewSessions)
      .where(eq(schema.interviewSessions.id, id))
      .limit(1)
  )[0]!;
}

r.get("/:id/interview", async (c) => {
  const database = db(c.env.DB);
  const course = await getOwnedCourse(database, c.req.param("id"), c.get("userId"));
  if (!course) throw notFound("Course not found");
  const session = await getOrCreateInterview(database, course.id);
  return c.json({
    transcript: JSON.parse(session.transcript),
    coverage: JSON.parse(session.coverage),
    status: session.status,
  });
});

r.post("/:id/interview/messages", async (c) => {
  const database = db(c.env.DB);
  const course = await getOwnedCourse(database, c.req.param("id"), c.get("userId"));
  if (!course) throw notFound("Course not found");

  const body = z
    .object({ message: z.string().min(1) })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) throw unprocessable("A non-empty message is required", body.error.issues);

  const session = await getOrCreateInterview(database, course.id);
  const transcript = JSON.parse(session.transcript) as TranscriptEntry[];
  const userMessage = body.data.message;

  // Move out of draft into interviewing on first message.
  if (course.readyState === "draft") {
    await database
      .update(schema.courses)
      .set({ readyState: "interviewing", updatedAt: Date.now() })
      .where(eq(schema.courses.id, course.id));
  }

  const history: ChatMessage[] = [
    ...transcript.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
    { role: "user", content: userMessage },
  ];

  const generator = generatorByName("course-requirements")!;

  return runAgentStream(c, {
    course,
    phaseInstructions: INTERVIEW_INSTRUCTIONS,
    generators: [generator],
    history,
    onAssistantDone: async (assistantText) => {
      const updated: TranscriptEntry[] = [
        ...transcript,
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantText },
      ];
      await database
        .update(schema.interviewSessions)
        .set({ transcript: JSON.stringify(updated), updatedAt: Date.now() })
        .where(eq(schema.interviewSessions.id, session.id));
    },
    afterToolSuccess: async (toolName, _documentId, status) => {
      if (toolName === "emit_course_requirements" && status !== "needs_review") {
        await database
          .update(schema.interviewSessions)
          .set({
            status: "complete",
            coverage: JSON.stringify({ covered: [...REQUIRED_TOPICS], missing: [] }),
            updatedAt: Date.now(),
          })
          .where(eq(schema.interviewSessions.id, session.id));
      }
    },
  });
});

export default r;
