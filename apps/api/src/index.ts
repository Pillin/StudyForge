import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { ZodError } from "zod";
import type { AppContext } from "./env.js";
import { db } from "./db/queries.js";
import { SessionAuth, SESSION_COOKIE } from "./auth/session.js";
import { HttpError, unauthorized } from "./http.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import interviewRoutes from "./routes/interview.js";
import documentRoutes from "./routes/documents.js";
import classRoutes from "./routes/classes.js";

const app = new Hono<AppContext>();

app.use("*", (c, next) =>
  cors({
    origin: c.env.WEB_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true }));

// Public auth endpoints.
app.route("/auth", authRoutes);

// Authenticated boundary for everything course-related (FR-001/002/003).
const requireSession = async (c: Context<AppContext>, next: Next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const userId = token ? await new SessionAuth(db(c.env.DB)).verify(token) : null;
  if (!userId) throw unauthorized();
  c.set("userId", userId);
  await next();
};

app.use("/courses/*", requireSession);
app.route("/courses", courseRoutes);
app.route("/courses", interviewRoutes);
app.route("/courses", documentRoutes);
app.route("/courses", classRoutes);

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "Invalid input", details: err.issues } }, 422);
  }
  console.error("Unhandled error", err);
  return c.json({ error: { code: "INTERNAL", message: "Internal server error" } }, 500);
});

export default app;
