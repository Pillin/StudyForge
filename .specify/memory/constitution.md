# StudyForge Constitution

StudyForge is an AI instructional-design agent: a "teacher" that authors complete,
pedagogically-grounded **course packages** (courses composed of classes, each with
diagnostics, exercises, slides, glossaries, kahoots, facilitation guides, and more).
This constitution defines the non-negotiable principles every spec, plan, skill, and
line of code must uphold.

## Core Principles

### I. Pedagogy-First (NON-NEGOTIABLE)
Every generated artifact must be justifiable against an explicit pedagogical framework.
The system treats **5E** (Engage, Explore, Explain, Elaborate, Evaluate), **Bloom's
taxonomy** (cognitive levels for objectives and assessment), and **UDL** (Universal
Design for Learning — multiple means of engagement, representation, action/expression)
as first-class. Diagnostic assessment is structural, not optional: an **initial**
diagnostic (course entry), a **per-class** diagnostic, and a **final** diagnostic
(course exit) are always part of a complete course package. No artifact ships without
stated learning objectives tied to a Bloom level.

### II. Modular, Composable Skills (NON-NEGOTIABLE)
Capabilities are **skills**, and skills are modular and independently extensible.
A skill is a self-contained folder: `SKILL.md` (instructions), a JSON output `schema`,
and optional `templates/` and `examples/`. Skills are one of two kinds:
- **Generator skills** produce a deliverable (diagnostic-assessment, exercise-guide,
  glossary, kahoot, slides, facilitation-guide, lessons-learned, references, …) and are
  exposed to the model as **tools** (function calls).
- **Governing skills** define standards every generator obeys (pedagogical-frameworks,
  quality-guide, tone-and-narrative, visual-identity) and are **injected** into the
  system prompt for the relevant step.

Adding, removing, or versioning a skill MUST require only: a new spec, a new skill
folder, and a registry/manifest entry. It MUST NOT require changes to the agent engine.
The set of skills is open-ended by design — the listed skills are a starting set, not a
ceiling.

### III. Schema-Validated, Structured Output (NON-NEGOTIABLE)
Generator skills emit **structured, validatable** output against their JSON schema —
never free prose that downstream code must guess at. Tool-call arguments and persisted
artifacts are validated against the skill's schema before they are accepted or stored.
Invalid output is rejected and regenerated, not silently coerced. Schemas are the
contract between the agent, the database, and the frontend.

### IV. Quality Is an Enforced Gate, Not a Suggestion
The `quality-guide` governing skill defines an explicit acceptance bar (clarity,
objective alignment, accessibility, factual care, completeness). Before an artifact is
persisted, the agent self-checks it against the quality guide and the artifact's own
acceptance criteria. Artifacts that fail the gate are revised or flagged — never
persisted as if they passed. The quality bar is part of the spec for every generator
skill.

### V. Accessibility, Inclusion, and Configurability
UDL is built in, not bolted on. Generated material must support multiple means of
representation and expression. **Content language is configurable per course** (the
agent generates in the course's chosen language; the UI language is independent).
**Tone-and-narrative** and **visual-identity** are per-course and may vary — the system
never hard-codes a single voice or visual style.

### VI. Provider-Agnostic & Cloudflare-Native, Behind Clean Boundaries
The model provider is **OpenRouter**, accessed through an OpenAI-compatible interface
that is isolated behind a single client module — the rest of the system never depends on
OpenRouter specifics, and the model id is configurable. The runtime is **Cloudflare**:
the backend is a Cloudflare Worker; the frontend is a separate Cloudflare Worker running
TanStack Start; persistence is **Cloudflare D1**. **Authentication is a port**: the
system depends on an auth boundary (login → session → authenticated `userId`), not a
concrete provider. v1 may ship a minimal session implementation; WorkOS (or another
provider) MUST be adoptable by implementing the same boundary, with no changes to agent
or data-model code.

### VII. Simplicity & YAGNI
Start simple; add structure only when a spec justifies it. No speculative abstraction,
no organizational-only modules, no features absent from a spec. Complexity must be
justified against these principles in the relevant plan.

## Technology Constraints

- **Monorepo**: pnpm workspaces. `apps/api` (backend Worker), `apps/web` (TanStack Start
  Worker), `packages/shared` (TypeScript types: skill schemas, DTOs).
- **Backend**: Cloudflare Workers + Hono router; OpenRouter for inference (streaming via
  SSE; function-calling for tools).
- **Persistence**: Cloudflare D1 (data model: Course → Class → Artifacts), migrated via
  Wrangler.
- **Frontend**: TanStack Start (SSR + Router + Query) deployed on Cloudflare via the
  Cloudflare Vite plugin (`viteEnvironment: { name: "ssr" }`).
- **Two Workers**: API and web deploy independently.
- **Secrets**: `OPENROUTER_API_KEY` and provider config via `wrangler secret` / env — never
  committed.

## Development Workflow

- **Spec-Driven Development via GitHub Spec Kit** is mandatory. The flow is:
  `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` (de-risk) →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` (consistency) →
  `/speckit-implement`.
- Code is written **to the spec**. Each skill is built spec-first: spec → JSON schema →
  `SKILL.md` → tool handler → verification against acceptance criteria.
- Every artifact type has a corresponding spec under `specs/` before it is implemented.
- No implementation begins for a skill whose spec is incomplete or whose
  `/speckit-clarify` questions are unresolved.

## Governance

This constitution supersedes other practices. Any plan or implementation that conflicts
with a principle here is non-compliant and must be revised or the constitution amended
first. Amendments require: a documented rationale, a version bump per semantic
versioning (MAJOR = principle removed/redefined, MINOR = principle/section added, PATCH =
clarification), and propagation to dependent templates and specs. `/speckit-analyze` is
used to verify cross-artifact consistency before implementation. Runtime development
guidance lives alongside the active plan (referenced from `CLAUDE.md`).

**Version**: 1.0.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
