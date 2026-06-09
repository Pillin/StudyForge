import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AppContext } from "../env.js";
import { db, schema } from "../db/queries.js";
import { SessionAuth, SESSION_COOKIE } from "../auth/session.js";
import { AuthError } from "../auth/port.js";
import { conflict, unauthorized, unprocessable } from "../http.js";

const Creds = z.object({ email: z.string().email(), password: z.string().min(8) });

const r = new Hono<AppContext>();

// Dev-friendly cookie. For production over HTTPS set `secure: true`.
const cookie = { httpOnly: true, sameSite: "Lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

r.post("/signup", async (c) => {
  const body = Creds.safeParse(await c.req.json().catch(() => null));
  if (!body.success) throw unprocessable("Invalid credentials", body.error.issues);
  const auth = new SessionAuth(db(c.env.DB));
  try {
    const { userId, token } = await auth.signup(body.data.email, body.data.password);
    setCookie(c, SESSION_COOKIE, token, cookie);
    return c.json({ userId, email: body.data.email }, 201);
  } catch (e) {
    if (e instanceof AuthError) throw conflict("EMAIL_TAKEN", e.message);
    throw e;
  }
});

r.post("/login", async (c) => {
  const body = Creds.safeParse(await c.req.json().catch(() => null));
  if (!body.success) throw unprocessable("Invalid credentials", body.error.issues);
  const auth = new SessionAuth(db(c.env.DB));
  try {
    const { userId, token } = await auth.login(body.data.email, body.data.password);
    setCookie(c, SESSION_COOKIE, token, cookie);
    return c.json({ userId, email: body.data.email });
  } catch (e) {
    if (e instanceof AuthError) throw unauthorized("Invalid email or password");
    throw e;
  }
});

r.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await new SessionAuth(db(c.env.DB)).logout(token);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.body(null, 204);
});

r.get("/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  const userId = token ? await new SessionAuth(db(c.env.DB)).verify(token) : null;
  if (!userId) throw unauthorized();
  const rows = await db(c.env.DB)
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return c.json({ userId, email: rows[0]?.email });
});

export default r;
