import { describe, it, expect } from "vitest";
import { request, signup, createCourse, validRequirements, validMainPlan } from "./helpers.js";

async function putDoc(cookie: string, courseId: string, type: string, content: unknown) {
  return request(
    `/courses/${courseId}/documents/${type}`,
    { method: "PUT", body: JSON.stringify({ content }) },
    cookie,
  );
}

describe("approval gate + revocation + guard (T041, FR-016/016a, SC-004)", () => {
  it("blocks class generation until both docs approved, then 501; edit revokes", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);

    // pre-approval: guard blocks
    let guard = await request(`/courses/${courseId}/classes/generate`, { method: "POST" }, cookie);
    expect(guard.status).toBe(409);

    await putDoc(cookie, courseId, "course-requirements", validRequirements);
    await putDoc(cookie, courseId, "main-plan", validMainPlan);

    // both exist but not approved → still blocked
    guard = await request(`/courses/${courseId}/classes/generate`, { method: "POST" }, cookie);
    expect(guard.status).toBe(409);

    const approve = await request(`/courses/${courseId}/approve`, { method: "POST" }, cookie);
    expect(approve.status).toBe(200);
    expect(((await approve.json()) as { readiness: string }).readiness).toBe("ready");

    // ready → guard returns 501 (per-class generators are a later spec)
    guard = await request(`/courses/${courseId}/classes/generate`, { method: "POST" }, cookie);
    expect(guard.status).toBe(501);

    // editing the main-plan revokes approval
    await putDoc(cookie, courseId, "main-plan", validMainPlan);
    const course = await request(`/courses/${courseId}`, {}, cookie);
    expect(((await course.json()) as { readiness: string }).readiness).toBe("awaiting_approval");
    guard = await request(`/courses/${courseId}/classes/generate`, { method: "POST" }, cookie);
    expect(guard.status).toBe(409);
  });

  it("cannot approve when a document is missing", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);
    await putDoc(cookie, courseId, "course-requirements", validRequirements);
    const approve = await request(`/courses/${courseId}/approve`, { method: "POST" }, cookie);
    expect(approve.status).toBe(409);
  });
});

describe("manual edit validation (T042, FR-017a)", () => {
  it("a structure-breaking manual edit is saved needs_review, never approvable", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);
    await putDoc(cookie, courseId, "course-requirements", validRequirements);
    // invalid main-plan: time blocks do not sum to total_minutes
    const broken = { ...validMainPlan, time_distribution: [{ session_type: "standard", total_minutes: 180, blocks: [{ name: "x", activity: "y", minutes: 10 }] }] };
    const res = await putDoc(cookie, courseId, "main-plan", broken);
    const doc = (await res.json()) as { document: { status: string } };
    expect(doc.document.status).toBe("needs_review");

    const approve = await request(`/courses/${courseId}/approve`, { method: "POST" }, cookie);
    expect(approve.status).toBe(409); // needs_review cannot be approved
  });
});
