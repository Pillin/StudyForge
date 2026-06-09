import { describe, it, expect } from "vitest";
import { request, signup, createCourse, validRequirements } from "./helpers.js";

describe("versions + ownership isolation (T047, FR-017/019, SC-007)", () => {
  it("lists versions and reopens a prior version", async () => {
    const { cookie } = await signup();
    const courseId = await createCourse(cookie);

    for (let i = 0; i < 2; i++) {
      await request(
        `/courses/${courseId}/documents/course-requirements`,
        { method: "PUT", body: JSON.stringify({ content: validRequirements }) },
        cookie,
      );
    }

    const versions = await request(
      `/courses/${courseId}/documents/course-requirements/versions`,
      {},
      cookie,
    );
    const list = (await versions.json()) as { versions: { version: number }[] };
    expect(list.versions.length).toBe(2);
    expect(list.versions.map((v) => v.version).sort()).toEqual([1, 2]);

    const v1 = await request(
      `/courses/${courseId}/documents/course-requirements/versions/1`,
      {},
      cookie,
    );
    expect(v1.status).toBe(200);
  });

  it("does not leak another user's versions", async () => {
    const a = await signup();
    const courseId = await createCourse(a.cookie);
    await request(
      `/courses/${courseId}/documents/course-requirements`,
      { method: "PUT", body: JSON.stringify({ content: validRequirements }) },
      a.cookie,
    );
    const b = await signup();
    const res = await request(
      `/courses/${courseId}/documents/course-requirements/versions`,
      {},
      b.cookie,
    );
    expect(res.status).toBe(404);
  });
});
