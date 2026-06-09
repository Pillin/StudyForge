import { Hono } from "hono";
import type { AppContext } from "../env.js";
import { db, getOwnedCourse } from "../db/queries.js";
import { notFound, conflict, HttpError } from "../http.js";

const r = new Hono<AppContext>();

/**
 * Per-class generation guard (FR-016 / SC-004). This slice ships no per-class
 * generators, so it returns 409 until approved and 501 once ready — proving the
 * approval gate end-to-end.
 */
r.post("/:id/classes/generate", async (c) => {
  const course = await getOwnedCourse(db(c.env.DB), c.req.param("id"), c.get("userId"));
  if (!course) throw notFound("Course not found");
  if (course.readyState !== "ready") {
    throw conflict("AWAITING_APPROVAL", "Approve the requirements and main-plan first.");
  }
  throw new HttpError(501, "NOT_IMPLEMENTED", "Per-class generators are a later spec.");
});

export default r;
