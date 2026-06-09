# Phase 0 Research — Course Planning Backbone

The stack was decided in the constitution; this records the key technical decisions and the
few resolved unknowns. No `NEEDS CLARIFICATION` remain.

## Decision: TanStack Start on Cloudflare Workers via the Cloudflare Vite plugin
- **Decision**: Build `apps/web` with TanStack Start, deploy to a Cloudflare Worker using
  `@cloudflare/vite-plugin` with `viteEnvironment: { name: "ssr" }` and a `wrangler.jsonc`.
- **Rationale**: Officially supported path (Cloudflare changelog 2025-10-24 / Workers
  framework guide); SSR runs in the same Worker model as the rest of the platform.
- **Alternatives**: Cloudflare Pages SPA (less integrated SSR); Next.js (heavier, less clean
  on Workers). Rejected for divergence from the agreed stack.

## Decision: OpenRouter via OpenAI-compatible Chat Completions
- **Decision**: Call `POST https://openrouter.ai/api/v1/chat/completions` with `stream: true`
  (SSE) and `tools` (function-calling). Wrap in a single `agent/openrouter.ts` module — the
  only place provider specifics live (Principle VI).
- **Rationale**: OpenRouter implements the OpenAI spec, standardizes tool-calling across
  models, supports streaming + parallel tool calls. Model id is env-configurable.
- **Alternatives**: Direct Anthropic/OpenAI SDKs (couples us to one provider). Rejected.
- **Model default**: a current tool-capable model id, set via env (`OPENROUTER_MODEL`); not
  hardcoded in logic.

## Decision: Zod as the single schema source; derive tool JSON Schemas
- **Decision**: Define every skill's I/O and all DTOs as Zod schemas in `packages/shared`;
  derive OpenRouter tool `parameters` via `zod-to-json-schema`; validate tool-call arguments
  with the same Zod schema before persisting.
- **Rationale**: One source of truth satisfies Principle III (schema-validated output) for
  both the model-facing contract and runtime validation; eliminates drift.
- **Alternatives**: Hand-written JSON Schema + separate validator (drift risk). Rejected.

## Decision: Drizzle ORM over Cloudflare D1
- **Decision**: Use Drizzle for typed schema + queries + migrations against D1.
- **Rationale**: Type-safe, Workers/D1-compatible, first-class migrations via Wrangler;
  lighter than a full ORM.
- **Alternatives**: Raw SQL + hand-rolled migrations (more boilerplate, no types); Prisma
  (heavier on Workers). Rejected.

## Decision: Skills are build-time-bundled modules + a TS registry
- **Decision**: Each skill is a folder with `SKILL.md` (imported as raw text at build time)
  and a Zod schema module (for generators). A `registry.ts` manifest lists skills with
  `{ name, kind: generator|governing, schema?, instructionsRef, renderer? }`. The agent loop
  reads the registry; governing skills are concatenated into the system prompt, generators
  are exposed as tools.
- **Rationale**: Workers have no runtime filesystem, so "markdown skills" must be bundled.
  Adding a skill = new folder + manifest entry + rebuild — still no engine change
  (Principle II).
- **Alternatives**: Store skills in D1/KV and load at runtime (added latency + indirection;
  unnecessary for a fixed compiled skill set). Deferred.

## Decision: Bounded agent tool-calling loop with SSE
- **Decision**: `agent/loop.ts` runs: assemble messages (system = base + injected governing
  skills + course config) → call OpenRouter (stream) → if `tool_calls`, validate args (Zod),
  run handler (persist a draft version), append tool result, loop → stop on final text or
  `MAX_ROUNDS`. Stream tokens + tool-step events to the client as SSE.
- **Rationale**: Matches OpenRouter tool-calling; bounding rounds respects Workers CPU
  limits; SSE satisfies the incremental-progress requirement (FR-021).

## Decision: Auth as a port; session-stub implementation
- **Decision**: `auth/port.ts` defines `AuthPort` (signup/login/logout/verify → `userId`).
  v1 ships a D1-backed session-cookie stub (`auth/session.ts`). WorkOS adopts the same port
  later.
- **Rationale**: Principle VI; unblocks building the product now without committing to a
  provider.
- **Alternatives**: Integrate WorkOS now (external setup dependency, slows the core). Deferred.

## Decision: SSE in Workers
- **Decision**: Stream with a `ReadableStream` and `Content-Type: text/event-stream`; the
  web client reads it via a small SSE reader (TanStack Query consumes the final state).
- **Rationale**: Native to the Workers runtime; no extra infra.

## Resolved unknowns
- **Planned sessions storage**: kept inside the `main-plan` document content (Zod-validated
  array), not normalized into a table for this slice — simplest correct model (Principle VII).
- **Approval representation**: derived from the latest version status of each document
  (`approved` on both → course ready); no separate approvals table. A new version flips the
  doc off `approved`, which revokes course readiness (FR-016a).
