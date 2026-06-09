---
description: "Task list for Foundation Vertical Slice — Course Planning Backbone"
---

# Tasks: Foundation Vertical Slice — Course Planning Backbone

**Input**: Design documents from `/specs/001-foundation-planning-backbone/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Targeted tests are INCLUDED for gate-critical logic (schema validation, approval
state machine, ownership) per plan.md (Vitest + `@cloudflare/vitest-pool-workers`). They are
not full TDD coverage — they protect the constitution's non-negotiable behaviors.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec.md user stories; Setup/Foundational/Polish carry no story label
- Paths follow the monorepo in plan.md (`apps/api`, `apps/web`, `packages/shared`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo + both Workers + shared package + tooling

- [x] T001 Create pnpm monorepo root: `package.json`, `pnpm-workspace.yaml` (apps/*, packages/*), `.gitignore` (.dev.vars, .wrangler, dist, node_modules), `tsconfig.base.json`
- [x] T002 [P] Scaffold `packages/shared` (TS package: `src/index.ts`, build/exports) for Zod schemas + DTOs
- [ ] T003 [P] Scaffold `apps/api` Cloudflare Worker: `apps/api/wrangler.jsonc` (D1 binding, vars), `apps/api/src/index.ts` (Hono app), `apps/api/src/env.ts` (typed Env), `apps/api/.dev.vars.example` (OPENROUTER_API_KEY, OPENROUTER_MODEL)
- [ ] T004 [P] Scaffold `apps/web` TanStack Start Worker: `apps/web/vite.config.ts` (`@cloudflare/vite-plugin`, `viteEnvironment:{name:"ssr"}`), `apps/web/wrangler.jsonc`, app entry + root route
- [ ] T005 [P] Configure tooling: ESLint + Prettier + root `tsconfig` references; `vitest.config.ts` with `@cloudflare/vitest-pool-workers` in `apps/api` and a plain Vitest config in `packages/shared`
- [ ] T006 [P] Add Drizzle: `apps/api/drizzle.config.ts` + `db:migrate`/`db:generate` scripts wrapping drizzle-kit + `wrangler d1 migrations apply --local`

**Checkpoint**: `pnpm install` clean; both Workers boot with a health route; shared package imports resolve.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schemas, DB, auth, agent engine, governing skills — shared by all stories

**⚠️ CRITICAL**: No user-story work begins until this phase is complete

### Shared schemas (single source of truth)
- [x] T007 [P] Define enums + DTOs in `packages/shared/src/dto.ts` (CourseConfig, readiness states, document type/status/origin, error shape)
- [x] T008 [P] Define `CourseRequirementsContent` Zod schema in `packages/shared/src/schemas/course-requirements.ts` (contract sections + `missing_info[]`)
- [x] T009 [P] Define `MainPlanContent` Zod schema in `packages/shared/src/schemas/main-plan.ts` (description, narrative_thread, sessions[] w/ Bloom objectives, time_distribution, difficulty_progression, accessibility_plan, technology, planned_files[])
- [x] T010 [P] Add `zod-to-json-schema` helper in `packages/shared/src/json-schema.ts` (Zod → OpenRouter tool `parameters`)
- [x] T011 [P] Unit test schema validation in `packages/shared/test/schemas.test.ts` (valid/invalid fixtures; time_distribution sum rule)

### Database (D1 + Drizzle)
- [ ] T012 Define Drizzle schema in `apps/api/src/db/schema.ts` (users, sessions, courses, interview_sessions, documents) per data-model.md
- [ ] T013 Generate initial migration into `apps/api/migrations/` and wire `db:migrate`
- [ ] T014 [P] Implement query helpers in `apps/api/src/db/queries.ts` (latest-version lookup, owner-scoped reads)

### Auth (port + stub)
- [ ] T015 [P] Define `AuthPort` interface in `apps/api/src/auth/port.ts` (signup/login/logout/verify → userId)
- [ ] T016 Implement D1 session-stub in `apps/api/src/auth/session.ts` (password hashing, cookie token) satisfying `AuthPort`
- [ ] T017 Add auth middleware in `apps/api/src/index.ts` (attach userId; 401 when absent) and mount `routes/auth.ts`; configure CORS allowlist for the web origin in `apps/api/src/index.ts`
- [ ] T018 [P] Contract test auth + ownership in `apps/api/test/auth.test.ts` (login, `/auth/me`, 404 on non-owned resource)

### Agent engine (provider seam + loop + registry)
- [ ] T019 [P] Implement OpenRouter client in `apps/api/src/agent/openrouter.ts` (OpenAI-compatible chat completions, `stream:true`, `tools`) — the ONLY provider seam
- [ ] T020 [P] Implement SSE helper in `apps/api/src/agent/sse.ts` (ReadableStream, `text/event-stream`, event types per contracts/sse.md)
- [ ] T021 Author governing skill files (SKILL.md) under `apps/api/src/skills/{pedagogical-frameworks,quality-guide,time-distribution,tone-and-narrative,visual-identity}/SKILL.md`
- [ ] T022 Implement skill registry in `apps/api/src/agent/registry.ts` (manifest: generators+governing; raw-text import of SKILL.md) and prompt assembly in `apps/api/src/agent/prompt.ts` (inject governing skills + course config)
- [ ] T023 Implement bounded tool loop in `apps/api/src/agent/loop.ts` + dispatch in `apps/api/src/agent/tools.ts` (zod-validate args → handler; MAX_TOOL_ROUNDS; emit SSE events)

### Shared services
- [ ] T024 [P] Implement quality-gate service in `apps/api/src/services/quality.ts` (structural + language + quality-guide self-check → pass | needs_review+flags)
- [ ] T025 Implement document versioning + course readiness state machine in `apps/api/src/services/documents.ts` (new version, derive readiness, revoke-on-change) per data-model.md
- [ ] T026 [P] Contract test the state machine in `apps/api/test/state-machine.test.ts` (approve→ready; new version→awaiting_approval; needs_review never ready)

### Web shell
- [ ] T027 [P] Implement API client + TanStack Query setup in `apps/web/src/lib/api.ts` + `apps/web/src/lib/query.ts`, and an SSE reader in `apps/web/src/lib/sse.ts`; incl. web→API connectivity (service binding in `apps/web/wrangler.jsonc` or `API_BASE_URL` var) and base-URL resolution in `apps/web/src/lib/api.ts`
- [ ] T028 [P] Build auth pages + app layout in `apps/web/src/routes/{login,signup,__root}.tsx` (session-guarded shell)

**Checkpoint**: schemas validate; migrations apply; auth works; an agent turn can stream and call a no-op tool. User stories can now begin.

---

## Phase 3: User Story 1 — Guided requirements interview → the contract (Priority: P1) 🎯 MVP

**Goal**: Authenticated educator configures a course, completes a standardized adaptive interview (no assumptions), and gets a `course-requirements` document.

**Independent Test**: Sign in, create a course, answer the interview incl. a vague answer (expect a follow-up), finish; verify `course-requirements` covers all required topics + `missing_info[]` resolutions, in the course language.

### Tests for US1
- [ ] T029 [P] [US1] Contract test course create + interview SSE in `apps/api/test/us1-interview.test.ts` (vague answer → follow-up; coverage completeness; requirements persisted + validated; incl. a case with inclusion/role-model toggles OFF — Principle IX off-path)

### Implementation for US1
- [ ] T030 [P] [US1] Author `interview` skill: `apps/api/src/skills/interview/SKILL.md` + required-topic coverage schema in `apps/api/src/skills/interview/topics.ts`
- [ ] T031 [P] [US1] Author `course-requirements` generator skill: `apps/api/src/skills/course-requirements/SKILL.md`; register as `emit_course_requirements` tool (uses T008 schema) in registry
- [ ] T032 [US1] Implement `routes/courses.ts`: `POST /courses` (config → draft) and `GET /courses/:id` (with readiness)
- [ ] T033 [US1] Implement `routes/interview.ts`: `GET /courses/:id/interview` + `POST /courses/:id/interview/messages` (SSE; persist interview_session; update coverage; draft→interviewing)
- [ ] T034 [US1] Implement `emit_course_requirements` handler — invoked from the interview-complete path (T033); validate → version via T025 → quality gate via T024
- [ ] T035 [P] [US1] Web: course create/config form + interview chat view in `apps/web/src/routes/courses.new.tsx` + `apps/web/src/routes/courses.$id.interview.tsx` (consume SSE)

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Generate the main plan (Priority: P1)

**Goal**: From completed requirements, generate a `main-plan` blueprint with Bloom-labeled objectives, 5E structure, and per-session-type time distributions summing to the configured duration.

**Independent Test**: From a requirements doc, generate the main-plan; verify required sections, objective verbs+Bloom, and time sums.

### Tests for US2
- [ ] T036 [P] [US2] Contract test main-plan generation in `apps/api/test/us2-mainplan.test.ts` (ordering: requires completed requirements; time_distribution sum; objectives carry Bloom)

### Implementation for US2
- [ ] T037 [P] [US2] Author `main-plan` generator skill: `apps/api/src/skills/main-plan/SKILL.md`; register as `emit_main_plan` tool (uses T009 schema)
- [ ] T038 [US2] Implement `routes/documents.ts` generate endpoint serving both document types (regeneration of either; first-time `main_plan`): `POST /courses/:id/documents/:type/generate` (SSE) with ordering guard (main_plan requires a complete course_requirements — FR-016)
- [ ] T039 [US2] Implement `emit_main_plan` handler (validate incl. time-sum rule → version → quality gate)
- [ ] T040 [P] [US2] Web: document generate + render view in `apps/web/src/routes/courses.$id.plan.tsx` (stream + show sessions/time tables)

**Checkpoint**: US1 + US2 both work; requirements and main-plan both producible.

---

## Phase 5: User Story 3 — Approval gate & revision loop (Priority: P1)

**Goal**: Single approval of both docs unlocks per-class generation; editing/regenerating revokes approval; manual + agent edits both versioned and validated.

**Independent Test**: Generate both docs; attempt class generation pre-approval (blocked 409); request revision (new version); approve; confirm ready; edit → reverts to awaiting_approval.

### Tests for US3
- [ ] T041 [P] [US3] Contract test approval + revocation + guard in `apps/api/test/us3-approval.test.ts` (409 before approve; approve→ready; edit revokes; 501 guard when ready)
- [ ] T042 [P] [US3] Contract test manual-edit validation in `apps/api/test/us3-manual-edit.test.ts` (structure-breaking PUT → 422 or needs_review; never approved — FR-017a)

### Implementation for US3
- [ ] T043 [US3] Implement `POST /courses/:id/approve` in `routes/documents.ts` (approve latest versions of both atomically; 409 if missing/needs_review)
- [ ] T044 [US3] Implement manual edit `PUT /courses/:id/documents/:type` (validate structure → new version origin=manual; revoke approval via T025)
- [ ] T045 [US3] Implement guarded `POST /courses/:id/classes/generate` in `routes/classes.ts` (409 AWAITING_APPROVAL unless ready; 501 NOT_IMPLEMENTED when ready)
- [ ] T046 [P] [US3] Web: approval controls + "request changes" + edit affordance in `apps/web/src/routes/courses.$id.tsx` (readiness banner, approve button)

**Checkpoint**: full plan-then-generate gate enforced end-to-end.

---

## Phase 6: User Story 4 — Persist, reopen, versions & progress (Priority: P2)

**Goal**: Courses, interview state, and document versions persist per owner; prior versions reopenable; generation progress streams.

**Independent Test**: Produce docs, reload app, reopen a prior version; confirm intact + owner-only; observe incremental SSE; failure shows error with no partial-complete doc.

### Tests for US4
- [ ] T047 [P] [US4] Contract test versions + ownership isolation in `apps/api/test/us4-versions.test.ts` (list versions; reopen v(n); other user gets 404)

### Implementation for US4
- [ ] T048 [US4] Implement version endpoints in `routes/documents.ts`: `GET …/versions` + `GET …/versions/:v`; and `GET /courses` list (owner-scoped)
- [ ] T049 [P] [US4] Web: courses list + version history/viewer in `apps/web/src/routes/index.tsx` + `apps/web/src/routes/courses.$id.versions.tsx`
- [ ] T050 [P] [US4] Web: incremental progress + error handling in the SSE reader/views (no partial-complete display)

**Checkpoint**: workflow is a persistent, multi-session usable product.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T051 [P] Centralized error handling + structured logging in `apps/api/src/index.ts`
- [ ] T052 [P] README + run docs in `README.md` (link constitution, plan, quickstart)
- [ ] T053 Run all `quickstart.md` validation scenarios end-to-end (local `wrangler dev`)
- [ ] T054 [P] Seed/dev script for a sample course in `apps/api/scripts/seed.ts`
- [ ] T055 Verify constitution gates hold on the built slice (skills modular/addable, no provider leakage outside openrouter.ts, language enforced)

---

## Dependencies & Execution Order

### Phase dependencies
- Setup (P1) → Foundational (P2, BLOCKS all stories) → User Stories (P3–P6) → Polish (P7).
- US1, US2, US3, US4 all depend on Foundational. US2 depends on US1's document model being present (shared in Foundational T025); US3 depends on US2 (needs both docs to gate); US4 is largely independent (reads versions). Recommended order: US1 → US2 → US3 → US4.

### Within a story
- Tests (where present) before implementation; skills/schemas before handlers; handlers before endpoints; endpoints before web views.

### Parallel opportunities
- Setup: T002–T006 in parallel.
- Foundational: schema tasks T007–T011 parallel; T019/T020/T024/T027/T028 parallel; DB (T012–T014) and auth (T015–T018) parallel tracks.
- Within each story, [P] skill-authoring + web tasks run alongside API handler work.

---

## Parallel Example: Foundational schemas
```bash
Task: "Define DTOs in packages/shared/src/dto.ts"                       # T007
Task: "Define CourseRequirementsContent schema"                         # T008
Task: "Define MainPlanContent schema"                                   # T009
Task: "Add zod-to-json-schema helper"                                   # T010
```

---

## Implementation Strategy

### MVP first (US1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational (critical) → 3. Phase 3 US1 → **STOP & validate the interview→requirements path** → demo.

### Incremental delivery
US1 (interview→requirements) → US2 (main-plan) → US3 (approval gate, the headline feature) → US4 (persistence/versions/progress). Each is an independently testable increment.

---

## Notes
- [P] = different files, no incomplete dependencies.
- Commit after each task or logical group.
- Every saved document must be schema-valid (Principle III) and language-correct; the gate is enforced in T024/T025 and exercised by story tests.
- Adding a future generator skill (slides/kahoot/…) must reuse this engine: new skill folder + registry entry + Zod schema only (Principle II) — validated in T055.
