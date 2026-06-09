# Quickstart — Course Planning Backbone

Run and validate the backbone locally. This is a run/validation guide; implementation lives
in `tasks.md` + the implementation phase.

## Prerequisites
- Node 20+ and pnpm (repo uses pnpm workspaces).
- Wrangler (via `pnpm dlx wrangler` or dev dependency); a Cloudflare account for remote
  deploy (local dev runs without one).
- An OpenRouter API key.

## Setup
```bash
pnpm install

# Secrets / env (local). API Worker:
#   OPENROUTER_API_KEY=...   OPENROUTER_MODEL=<tool-capable model id>
# put these in apps/api/.dev.vars (gitignored)

# D1: create local DB + apply migrations
pnpm --filter api db:migrate        # wraps drizzle-kit + wrangler d1 migrations apply --local
```

## Run (two Workers)
```bash
pnpm --filter api dev    # Hono API on http://localhost:8787
pnpm --filter web dev    # TanStack Start on http://localhost:5173 (proxies /api → 8787)
```

## End-to-end validation scenarios
Each maps to a spec acceptance criterion / success criterion.

1. **Auth + course config (FR-001/004)** — Sign up, log in, create a course with subject,
   audience, age range, language, role term. Expect `ready_state: draft`.
2. **Interview, no-assume (US1 / FR-010/011, SC-002)** — Start the interview; give one vague
   answer (e.g. "como 3 horas con kahoot"). Expect a clarifying follow-up, not an assumption;
   finish; confirm `course-requirements` lists every required topic and a `missing_info[]`
   with resolutions, in the course language.
3. **Main-plan from requirements (US2 / FR-013–015, SC-003)** — Generate the main-plan.
   Confirm narrative thread, one session row per session, objectives with observable verbs +
   Bloom levels, and per-session-type time distributions that sum to the configured duration.
4. **Approval gate blocks generation (US3 / FR-016, SC-004)** — Before approving, call
   `POST /courses/:id/classes/generate`. Expect `409 AWAITING_APPROVAL`.
5. **Approve unlocks (US3)** — `POST /courses/:id/approve`. Expect `ready`. Re-call the guard:
   expect `501 NOT_IMPLEMENTED` (per-class generators are a later spec).
6. **Edit revokes approval (FR-016a)** — Manually edit the main-plan (`PUT …/main-plan`) or
   regenerate it. Confirm a new version is created and `ready_state` returns to
   `awaiting_approval`; the guard returns `409` again.
7. **Manual edit validation (FR-017a)** — `PUT` an intentionally structure-breaking edit.
   Expect `422` (rejected) or a saved version flagged `needs_review` — never `approved`.
8. **Versioning + persistence (FR-017/019, SC-007)** — List versions; reopen a prior version;
   reload the app; confirm courses/versions persist and are visible only to the owner.
9. **Streaming + failure (FR-020/021)** — Observe incremental SSE during generation; simulate
   a failure and confirm an `error` event with no partial document left as complete.

## Deploy (reference)
```bash
pnpm --filter api deploy       # wrangler deploy (after `wrangler secret put OPENROUTER_API_KEY`)
pnpm --filter web deploy       # wrangler deploy (Cloudflare Vite plugin build)
```
