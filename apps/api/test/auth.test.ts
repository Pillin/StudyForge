import { describe, it, expect } from "vitest";
import { request, signup, createCourse } from "./helpers.js";

describe("auth + ownership (T018, FR-001/002)", () => {
  it("signs up and returns the session via /auth/me", async () => {
    const { cookie, email } = await signup();
    const me = await request("/auth/me", {}, cookie);
    expect(me.status).toBe(200);
    expect(((await me.json()) as { email: string }).email).toBe(email);
  });

  it("rejects /auth/me without a session", async () => {
    const me = await request("/auth/me");
    expect(me.status).toBe(401);
  });

  it("blocks course access without a session", async () => {
    const res = await request("/courses");
    expect(res.status).toBe(401);
  });

  it("returns 404 for a course owned by another user", async () => {
    const a = await signup();
    const courseId = await createCourse(a.cookie);
    const b = await signup();
    const res = await request(`/courses/${courseId}`, {}, b.cookie);
    expect(res.status).toBe(404);
  });
});
