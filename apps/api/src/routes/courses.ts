import { Hono } from "hono";
import { ZodError } from "zod";
import type { AppContext } from "../env.js";
import { db, getOwnedCourse } from "../db/queries.js";
import { createCourse, listCourses, courseToDTO } from "../services/courses.js";
import { notFound, unprocessable } from "../http.js";

const r = new Hono<AppContext>();

r.post("/", async (c) => {
  const userId = c.get("userId");
  try {
    const course = await createCourse(db(c.env.DB), userId, await c.req.json().catch(() => ({})));
    return c.json({ course }, 201);
  } catch (e) {
    if (e instanceof ZodError) throw unprocessable("Invalid course configuration", e.issues);
    throw e;
  }
});

r.get("/", async (c) => {
  const courses = await listCourses(db(c.env.DB), c.get("userId"));
  return c.json({ courses });
});

r.get("/:id", async (c) => {
  const row = await getOwnedCourse(db(c.env.DB), c.req.param("id"), c.get("userId"));
  if (!row) throw notFound("Course not found");
  return c.json({ course: courseToDTO(row), readiness: row.readyState });
});

export default r;
