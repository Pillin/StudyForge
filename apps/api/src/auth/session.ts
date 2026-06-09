import { eq, and } from "drizzle-orm";
import type { DB } from "../db/queries.js";
import { schema } from "../db/queries.js";
import { AuthError, type AuthPort } from "./port.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const saltOut = saltHex ?? toHex(salt.buffer as ArrayBuffer);
  return `${saltOut}:${toHex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex] = stored.split(":");
  if (!saltHex) return false;
  const candidate = await hashPassword(password, saltHex);
  // constant-ish comparison
  return candidate === stored;
}

/** D1-backed session-stub implementation of AuthPort. */
export class SessionAuth implements AuthPort {
  constructor(private readonly db: DB) {}

  private async createSession(userId: string): Promise<string> {
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    await this.db.insert(schema.sessions).values({
      token,
      userId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
  }

  async signup(email: string, password: string) {
    const existing = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing[0]) throw new AuthError("EMAIL_TAKEN", "Email already registered");
    const userId = crypto.randomUUID();
    await this.db.insert(schema.users).values({
      id: userId,
      email,
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    });
    const token = await this.createSession(userId);
    return { userId, token };
  }

  async login(email: string, password: string) {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }
    const token = await this.createSession(user.id);
    return { userId: user.id, token };
  }

  async logout(token: string) {
    await this.db.delete(schema.sessions).where(eq(schema.sessions.token, token));
  }

  async verify(token: string): Promise<string | null> {
    const rows = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .limit(1);
    const s = rows[0];
    if (!s) return null;
    if (s.expiresAt < Date.now()) {
      await this.db.delete(schema.sessions).where(eq(schema.sessions.token, token));
      return null;
    }
    return s.userId;
  }
}

export const SESSION_COOKIE = "sf_session";
