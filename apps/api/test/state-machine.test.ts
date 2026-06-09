import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { CourseRequirementsContent, MainPlanContent } from "@studyforge/shared";
import { db, schema } from "../src/db/queries.js";
import { persistVersion, approveCourse } from "../src/services/documents.js";
import { signup, createCourse, validRequirements, validMainPlan } from "./helpers.js";

async function readiness(d: ReturnType<typeof db>, courseId: string): Promise<string> {
  const row = (
    await d.select().from(schema.courses).where(eq(schema.courses.id, courseId)).limit(1)
  )[0];
  return row!.readyState;
}

describe("readiness state machine (T026, FR-016/016a/018)", () => {
  it("progresses draft → interviewing → awaiting_approval → ready and revokes on edit", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);
    const d = db(env.DB);

    await persistVersion(d, {
      courseId,
      type: "course_requirements",
      origin: "agent",
      content: validRequirements,
      contentSchema: CourseRequirementsContent,
    });
    expect(await readiness(d, courseId)).toBe("interviewing");

    await persistVersion(d, {
      courseId,
      type: "main_plan",
      origin: "agent",
      content: validMainPlan,
      contentSchema: MainPlanContent,
    });
    expect(await readiness(d, courseId)).toBe("awaiting_approval");

    expect(await approveCourse(d, courseId)).toBe("ready");
    expect(await readiness(d, courseId)).toBe("ready");

    // a new version revokes approval (FR-016a)
    await persistVersion(d, {
      courseId,
      type: "main_plan",
      origin: "manual",
      content: validMainPlan,
      contentSchema: MainPlanContent,
    });
    expect(await readiness(d, courseId)).toBe("awaiting_approval");
  });

  it("a failing document is needs_review and is never approvable", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);
    const d = db(env.DB);

    await persistVersion(d, {
      courseId,
      type: "course_requirements",
      origin: "agent",
      content: validRequirements,
      contentSchema: CourseRequirementsContent,
    });
    const bad = await persistVersion(d, {
      courseId,
      type: "main_plan",
      origin: "agent",
      content: { ...validMainPlan, sessions: [] }, // violates min(1)
      contentSchema: MainPlanContent,
    });
    expect(bad.status).toBe("needs_review");
    expect(bad.review_flags).toBeTruthy();
    await expect(approveCourse(d, courseId)).rejects.toThrow();
  });
});
