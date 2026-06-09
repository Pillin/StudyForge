# StudyForge

An AI **teacher / instructional-design agent** that authors pedagogically-grounded course
material. An educator configures a course; a conversational agent runs a structured
requirements interview, then generates a course package through a **plan-then-generate**
workflow with an explicit approval gate. The platform is general-purpose and configurable
(audience, language, tone, visual identity) — not tied to any single mission.

> **Status: first slice implemented (54/55 tasks).** The planning-backbone slice is built and
> verified: `apps/api` (Cloudflare Worker — auth, agent engine, D1, all routes) typechecks and
> passes 12 tests; `apps/web` (TanStack Router + Query SPA on Cloudflare) typechecks and builds.
> The one remaining task is the live end-to-end run (`quickstart.md`), which needs a real
> OpenRouter key + `wrangler dev` — see [Deployment](#deployment) / local development.
>
> Note: the frontend is a TanStack **Router + Query SPA** (served by a Cloudflare Worker via
> static assets), a pragmatic v1 choice over TanStack **Start** (SSR); upgrading to Start later
> is straightforward and does not affect the API.

## How it works

- **Workflow (the spine)**: interview → `course-requirements` (the contract) → `main-plan`
  (the blueprint) → **explicit approval** → per-class generation → aggregation.
- **Skills** are modular: **generator** skills produce deliverables (exposed to the model as
  tools); **governing** skills (pedagogical frameworks, quality, tone, visual identity) are
  injected as standards. Adding a skill = a new folder + registry entry, no engine change.
- **Pedagogy-first**: 5E as the primary class structure, Bloom-labeled objectives, UDL — all
  as *internal design tools*, never taught to students.
- **Initial/final evaluations** are produced by separate dedicated skills; per-class
  formative assessment = Kahoot + reflection.

See [`specs/skills-backlog.md`](specs/skills-backlog.md) for the full planned skill set, and
[`.specify/memory/constitution.md`](.specify/memory/constitution.md) for the governing
principles.

## Architecture

| Layer | Choice |
|---|---|
| Backend | **Cloudflare Worker** (`apps/api`) — Hono router + agent engine |
| Model provider | **OpenRouter** (OpenAI-compatible; streaming + tool-calling), isolated behind one client module |
| Persistence | **Cloudflare D1** (SQLite) via Drizzle |
| Frontend | **TanStack Start** (`apps/web`) — SSR on a Cloudflare Worker via the Cloudflare Vite plugin |
| Shared | `packages/shared` — **Zod** schemas + DTOs (single source of truth; tool JSON Schemas derived via `zod-to-json-schema`) |
| Auth | A replaceable **auth port**; v1 ships a session-cookie stub; WorkOS adoptable later |

Two Workers deploy independently. Full detail:
[`specs/001-foundation-planning-backbone/plan.md`](specs/001-foundation-planning-backbone/plan.md).

## Repository layout

```
.specify/            # Spec Kit: constitution, templates, scripts, workflow config
.claude/             # Spec Kit slash-command skills for Claude Code
specs/
├── skills-backlog.md                       # planned skills + output formats
└── 001-foundation-planning-backbone/       # first slice
    ├── spec.md          # WHAT/WHY (user stories, requirements, acceptance)
    ├── plan.md          # technical plan + constitution gate
    ├── research.md      # decisions
    ├── data-model.md    # entities + readiness state machine
    ├── contracts/       # api.md, tools.md, sse.md
    ├── quickstart.md    # local run + validation scenarios
    └── tasks.md         # 55 ordered implementation tasks
apps/        # (created during implementation) api/ + web/ Workers
packages/    # (created during implementation) shared/
```

## Development workflow (Spec-Driven Development)

This project uses [GitHub Spec Kit](https://github.com/github/spec-kit). Slash commands (run
in Claude Code): `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` →
`/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

Re-run Spec Kit CLI commands with:
```bash
uvx --from git+https://github.com/github/spec-kit.git specify <command>
```

## Prerequisites

- **Node 20+** and **pnpm** (workspaces)
- **Wrangler** (Cloudflare CLI) — used via `pnpm dlx wrangler` or as a dev dependency
- A **Cloudflare account** (for deployment)
- An **OpenRouter API key**

## Local development

> Available after the Setup + Foundational tasks are implemented.

```bash
pnpm install

# API Worker secrets (local): create apps/api/.dev.vars (gitignored)
#   OPENROUTER_API_KEY=sk-or-...
#   OPENROUTER_MODEL=<a tool-capable model id>

# Create + migrate the local D1 database
pnpm --filter api db:migrate          # drizzle-kit generate + wrangler d1 migrations apply --local

# Run both Workers
pnpm --filter api dev                 # Hono API → http://localhost:8787
pnpm --filter web dev                 # TanStack Start → http://localhost:5173
```

Validate end-to-end with the scenarios in
[`specs/001-foundation-planning-backbone/quickstart.md`](specs/001-foundation-planning-backbone/quickstart.md).

## Deployment

Deploy the two Workers to Cloudflare independently. **This requires the apps to be
implemented first** (Setup + Foundational phases).

### 1. Authenticate

```bash
pnpm dlx wrangler login          # or run `! wrangler login` in Claude Code for the interactive flow
```

### 2. Provision Cloudflare D1 (one-time)

```bash
pnpm dlx wrangler d1 create studyforge
```

Copy the returned `database_id` into `apps/api/wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    { "binding": "DB", "database_name": "studyforge", "database_id": "<paste-id-here>" }
  ]
}
```

Apply migrations to the remote database:

```bash
pnpm --filter api exec wrangler d1 migrations apply studyforge --remote
```

### 3. Configure secrets / vars (API Worker)

```bash
pnpm --filter api exec wrangler secret put OPENROUTER_API_KEY      # paste your key
# OPENROUTER_MODEL can be a non-secret var in apps/api/wrangler.jsonc:
#   "vars": { "OPENROUTER_MODEL": "<tool-capable model id>" }
```

### 4. Deploy the API Worker

```bash
pnpm --filter api deploy          # wraps `wrangler deploy`
```

Note the deployed API URL (e.g. `https://studyforge-api.<subdomain>.workers.dev`).

### 5. Deploy the web Worker (TanStack Start)

The Cloudflare Vite plugin builds the SSR Worker; `wrangler deploy` ships it. Point the web
app at the API URL (via an env var or a Workers **service binding** to the API Worker, set in
`apps/web/wrangler.jsonc`), then:

```bash
pnpm --filter web deploy          # builds with @cloudflare/vite-plugin, then `wrangler deploy`
```

### 6. Post-deploy

- Confirm CORS / service binding lets the web Worker reach the API Worker.
- Smoke-test: sign up → create a course → run the interview → generate requirements + main
  plan → approval gate.
- For custom domains, add routes in each Worker's `wrangler.jsonc` (`routes` / `custom_domain`).

### CI/CD (optional)

Use the official `cloudflare/wrangler-action` in GitHub Actions to run `wrangler deploy` for
each app on push to `main`. Store `CLOUDFLARE_API_TOKEN` and `OPENROUTER_API_KEY` as repo
secrets.

## Configuration reference

| Name | Where | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | secret (both local `.dev.vars` and `wrangler secret`) | OpenRouter auth |
| `OPENROUTER_MODEL` | var | model id (tool-capable); never hardcoded in logic |
| D1 `DB` binding | `apps/api/wrangler.jsonc` | database binding name used by the API |
| Web → API URL / service binding | `apps/web/wrangler.jsonc` | how the frontend reaches the backend |

## License

TBD.
