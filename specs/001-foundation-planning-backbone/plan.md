# Implementation Plan: Foundation Vertical Slice — Course Planning Backbone

**Branch**: `001-foundation-planning-backbone` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-foundation-planning-backbone/spec.md`

## Summary

Build the plan-then-generate backbone of StudyForge: an authenticated educator configures a
course, a conversational agent runs a standardized requirements interview, and generates two
versioned, schema-validated documents — `course-requirements` then `main-plan` — which a
single explicit approval unlocks for (future) per-class generation. Editing/regenerating an
approved document revokes approval. Technical approach: a pnpm monorepo with two Cloudflare
Workers — an API Worker (Hono) hosting the agent engine (OpenRouter tool-calling loop +
injected governing skills + a skill registry) over Cloudflare D1, and a TanStack Start web
Worker — with all skill output and DTOs defined once as Zod schemas in a shared package and
validated at the tool boundary.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), targeting the Cloudflare Workers runtime
(V8 isolates, `nodejs_compat` where needed). Node/pnpm only for build & tooling.

**Primary Dependencies**: Hono (API routing); TanStack Start + TanStack Query/Router (web,
SSR on Workers via `@cloudflare/vite-plugin`); Zod (single source of truth for skill I/O and
DTOs) + `zod-to-json-schema` (to derive OpenRouter tool schemas); Drizzle ORM (typed D1
access + migrations); OpenRouter via `fetch` (OpenAI-compatible Chat Completions, `stream:
true`, `tools`).

**Storage**: Cloudflare D1 (SQLite). Drizzle migrations applied via Wrangler.

**Testing**: Vitest with `@cloudflare/vitest-pool-workers` (unit + integration against a
real Workers/D1 binding); contract tests assert request/response + tool schemas; web e2e
(Playwright) deferred to a later slice.

**Target Platform**: Two Cloudflare Workers (API + web), deployed independently.

**Project Type**: Web application (frontend + backend) in a pnpm monorepo.

**Performance Goals**: Non-LLM API endpoints p95 < 200 ms server time. Agent generation is
LLM-bound (seconds); responses stream incrementally via SSE so first token appears quickly.

**Constraints**: Workers runtime has **no filesystem at runtime** → skills (SKILL.md + Zod
schema) are **bundled at build time** and registered in a TS manifest (still: adding a skill
= new folder + manifest entry + rebuild, no engine change). Respect Workers CPU-time and
subrequest limits; keep the tool-call loop bounded (max rounds). Secrets (`OPENROUTER_API_KEY`)
via `wrangler secret`, never committed.

**Scale/Scope**: Early-stage — tens of educators, hundreds of courses; single-region D1 is
sufficient. This slice implements only the interview + `course-requirements` + `main-plan`
generators, the approval state machine, auth, persistence/versioning, and a minimal UI.

## Constitution Check

*GATE: evaluated against constitution v1.1.0. Must pass before Phase 0; re-checked after Phase 1.*

| # | Principle | How this plan satisfies it | Status |
|---|---|---|---|
| I | Pedagogy-First | `main-plan` skill enforces Bloom-labeled, observable-verb objectives and 5E structure; governing `pedagogical-frameworks` injected as design tool, never emitted as student content; initial/final evaluations explicitly deferred to separate skills | PASS |
| II | Modular skills | `skills/` folders + a TS registry/manifest; the agent loop reads the registry; adding a skill needs no engine change | PASS |
| III | Schema-validated output | Zod schemas in `packages/shared`; tool-call args validated before persist; non-conforming output rejected & regenerated | PASS |
| IV | Quality gate | `quality-guide` governing skill drives a self-check before persist; failing docs saved `needs_review` with flags (FR-018) | PASS |
| V | Accessibility/config/language | Per-course config (language/audience/role-term/…); language enforced by quality gate; UDL reflected in main-plan accessibility section | PASS |
| VI | Provider-agnostic + Cloudflare-native + auth port | OpenRouter isolated in one `openrouter.ts` client; `AuthPort` interface with a session-stub impl (WorkOS swappable later); runs on Workers + D1 | PASS |
| VII | Simplicity / YAGNI | Only backbone skills built; per-class generators & evaluations excluded; planned sessions kept inside the main-plan document (no premature normalization) | PASS |
| VIII | Plan-Then-Generate | Approval state machine; per-class generation endpoint guarded → 409 until approved; edit revokes approval | PASS |
| IX | Configurable, not hardcoded | Course config columns + `config` JSON; engine functions with optional features off; no audience hardcoded | PASS |

**Result**: No violations. Complexity Tracking left empty. (Two Workers is a constitution
Technology Constraint, not a complexity deviation.)

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-planning-backbone/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (api.md, tools.md, sse.md)
├── checklists/
│   └── requirements.md  # spec quality checklist (PASS)
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
package.json                 # pnpm workspaces root
pnpm-workspace.yaml
apps/
├── api/                     # Cloudflare Worker — agent backend
│   ├── wrangler.jsonc
│   ├── drizzle.config.ts
│   ├── migrations/          # D1 SQL migrations (generated by Drizzle)
│   └── src/
│       ├── index.ts         # Hono app: CORS, auth middleware, route mount
│       ├── env.ts           # typed Env bindings (DB, secrets)
│       ├── auth/
│       │   ├── port.ts      # AuthPort interface (login → session → userId)
│       │   └── session.ts   # session-stub implementation (D1-backed)
│       ├── agent/
│       │   ├── loop.ts      # bounded tool-calling loop + SSE emit
│       │   ├── openrouter.ts# OpenAI-compatible client (the ONLY provider seam)
│       │   ├── tools.ts     # tool dispatch: zod-validate args → handler
│       │   ├── registry.ts  # skill manifest (generator + governing)
│       │   └── prompt.ts    # system-prompt assembly (inject governing skills)
│       ├── skills/
│       │   ├── interview/            # SKILL.md + topics schema
│       │   ├── course-requirements/  # SKILL.md + zod schema (generator/tool)
│       │   ├── main-plan/            # SKILL.md + zod schema (generator/tool)
│       │   ├── pedagogical-frameworks/  # governing (SKILL.md)
│       │   ├── quality-guide/           # governing (SKILL.md + check criteria)
│       │   ├── time-distribution/       # governing (SKILL.md)
│       │   ├── tone-and-narrative/      # governing (SKILL.md)
│       │   └── visual-identity/         # governing (SKILL.md)
│       ├── routes/          # auth, courses, interview, documents, generate, classes(guard)
│       ├── db/              # schema.ts (Drizzle), queries.ts
│       └── services/        # course state machine, approval, versioning, quality gate
├── web/                     # TanStack Start Worker
│   ├── wrangler.jsonc
│   ├── vite.config.ts       # @cloudflare/vite-plugin, viteEnvironment ssr
│   └── src/
│       ├── routes/          # /login, /signup, /, /courses/$id (config, interview, docs, approve)
│       └── lib/             # api client, TanStack Query hooks, SSE reader
packages/
└── shared/                  # Zod schemas + types: skill I/O, DTOs, enums (single source of truth)
    └── src/
```

**Structure Decision**: pnpm monorepo, **two Workers** (`apps/api`, `apps/web`) per the
constitution, with a `packages/shared` schema/types package consumed by both. Skills are
build-time-bundled modules under `apps/api/src/skills/` registered in `agent/registry.ts`.
Planned sessions live inside the validated `main-plan` document content (not a separate
table) for this slice.

## Complexity Tracking

> No constitution violations; section intentionally empty.
