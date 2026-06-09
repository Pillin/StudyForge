import type { D1Database } from "@cloudflare/workers-types";

/** Bindings declared in wrangler.jsonc + secrets. */
export interface Env {
  DB: D1Database;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  WEB_ORIGIN: string;
}

/** Hono variables attached by middleware. */
export interface Vars {
  userId: string;
}

export type AppContext = { Bindings: Env; Variables: Vars };
