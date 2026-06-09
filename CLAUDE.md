# StudyForge — Agent Guide (CLAUDE.md)

StudyForge is an AI instructional-design agent that authors course material via a
plan-then-generate workflow. This file is the operating manual for any Claude Code session
working here. The authoritative rules live in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md) — when in doubt, that
wins.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-foundation-planning-backbone/plan.md` (and its `research.md`,
`data-model.md`, `contracts/`, `quickstart.md`). Project principles:
`.specify/memory/constitution.md`. Skill backlog: `specs/skills-backlog.md`.
<!-- SPECKIT END -->

## Working rules (non-negotiable)

These mirror the constitution (v1.1.0). Do not violate them; amend the constitution first if
one truly needs to change.

1. **Spec-Driven Development.** Follow Spec Kit: `constitution → specify → clarify → plan →
   tasks → analyze → implement`. **Write/​update the spec before code.** Do not implement a
   skill whose spec or clarifications are incomplete. Build each skill spec-first: spec →
   Zod schema → `SKILL.md` → tool handler → verify against acceptance criteria.
2. **Plan-Then-Generate (approval gate).** Course material flows interview →
   `course-requirements` → `main-plan` → **explicit approval** → per-class generation. Never
   let per-class generation run before approval; editing/regenerating an approved document
   revokes approval.
3. **Modular skills.** A skill = folder with `SKILL.md` + Zod schema (+ optional renderer).
   Adding/removing a skill must require only a folder + a `registry.ts` manifest entry — **no
   engine change.** Generator skills are tools; governing skills are injected into the prompt.
4. **Schema-validated output.** Zod schemas in `packages/shared` are the single source of
   truth; derive tool JSON Schemas via `zod-to-json-schema`; validate tool-call args and
   persisted content before storing. Reject + regenerate (agent) or reject/flag
   `needs_review` (manual edit) — never store malformed.
5. **Quality gate.** Self-check generated artifacts against `quality-guide` + structure +
   language before persist; on failure after retries, save `needs_review` with flags — never
   silently pass or discard.
6. **Pedagogy.** 5E is the primary class structure; objectives use observable verbs + Bloom
   levels; UDL baseline. Frameworks are **internal design tools — never explained to
   students** in output.
7. **Configurable, not hardcoded.** Audience, language, role term, tone, inclusion/role-model
   features are per-course config. No audience or mission is baked into the engine; it must
   work with optional features off.
8. **Provider seam + auth port.** OpenRouter access lives **only** in
   `apps/api/src/agent/openrouter.ts`; the model id is env-configurable. Auth is behind
   `AuthPort` (`apps/api/src/auth/port.ts`); the rest of the code depends on the port, not a
   provider.
9. **Web-native outputs.** Slides = **Slidev Markdown** (no `.pptx`); no `.zip` packaging.
   Other renderers are added behind the renderer seam, not in the engine.
10. **Simplicity / YAGNI.** No features absent from a spec; justify any complexity against the
    constitution in the plan.

## Stack & layout

- **Monorepo** (pnpm workspaces): `apps/api` (Hono Worker + agent engine), `apps/web`
  (TanStack Start Worker), `packages/shared` (Zod schemas + DTOs).
- **TypeScript strict** everywhere; runtime is **Cloudflare Workers** (no runtime filesystem
  → skills are build-time-bundled).
- **D1 + Drizzle** for persistence; **OpenRouter** for inference (streaming via SSE,
  function-calling for tools).
- Match the structure and module boundaries in `plan.md`. Key dirs: `agent/`
  (loop, openrouter, tools, registry, prompt), `skills/`, `routes/`, `db/`, `services/`,
  `auth/`.

## Common commands

```bash
pnpm install
pnpm --filter api db:migrate          # drizzle generate + d1 migrations apply --local
pnpm --filter api dev                 # API Worker (http://localhost:8787)
pnpm --filter web dev                 # web Worker (http://localhost:5173)
pnpm --filter api deploy              # wrangler deploy (API)
pnpm --filter web deploy              # wrangler deploy (web)
```

Deployment guide: [`README.md`](README.md#deployment). Local validation scenarios:
`specs/001-foundation-planning-backbone/quickstart.md`.

## Conventions

- **Secrets** (`OPENROUTER_API_KEY`) via `wrangler secret` / `apps/api/.dev.vars` — never
  commit them.
- **Commits**: conventional prefixes (`spec:`, `plan:`, `tasks:`, `feat:`, `fix:`, `docs:`,
  `chore:`). Commit after each task or logical group; keep specs and code in sync.
- **Don't** add provider-specific code outside the OpenRouter seam, hardcode an audience, or
  emit framework jargon into student-facing material.
- When the current feature changes, update the `<!-- SPECKIT ... -->` block to point at the
  active plan (or run `/speckit-plan`, which refreshes it).
