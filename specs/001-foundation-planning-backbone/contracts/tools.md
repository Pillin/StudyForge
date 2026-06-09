# Contract — Agent Tools & Skill Injection

Defines the model-facing contract: which **generator skills** are exposed as OpenRouter
tools, and how **governing skills** are injected. Tool `parameters` are derived from the
shared Zod schemas via `zod-to-json-schema`; tool-call arguments are re-validated with the
same Zod schema before any persist (Principle III).

## Skill registry entry (shape)
```
{ name, kind: "generator" | "governing", instructions: <SKILL.md text>,
  schema?: ZodSchema,           // generators only
  renderer?: string }           // future (e.g. "slidev"); unused this slice
```

## Generator skills → tools (this slice)

### `emit_course_requirements`
- **When**: interview coverage is complete enough to record the contract.
- **Arguments** (Zod `CourseRequirementsContent`): general_data, source_material_note,
  available_technology, pedagogical_criteria, constraints_decisions, `missing_info[]`
  (`{ item, resolution: "assumption" | "default" | "pending", detail }`).
- **Handler**: validate → persist new `documents` row (`type=course_requirements`,
  `origin=agent`, next version) → run quality gate → set `draft`/`needs_review`.

### `emit_main_plan`
- **When**: a completed `course_requirements` exists (enforced server-side, FR-016).
- **Arguments** (Zod `MainPlanContent`): description, narrative_thread, `sessions[]`
  (`{ ordinal, title, central_content, session_type, objectives:[{statement, bloom_level}],
  notes? }`), `time_distribution` (per session_type → blocks summing to configured duration),
  difficulty_progression, accessibility_plan, technology, `planned_files[]`.
- **Handler**: validate → persist new `main_plan` version → quality gate.

> No other generators in this slice. Adding one later = new skill folder + registry entry +
> its Zod schema; the loop and dispatch are unchanged (Principle II).

## Governing skills → system-prompt injection (this slice)
`pedagogical-frameworks` (5E primary; Bloom verbs; UDL; **internal design tools, never taught
to students**), `quality-guide` (acceptance criteria + the self-check the agent runs before
finalizing), `time-distribution` (session-type pacing + ambiguity resolution),
`tone-and-narrative` (voice + narrative continuity), `visual-identity` (brand cues; minimal
use this slice). Injected as labeled sections appended to the base system prompt, plus the
course config (language, audience, role_term, toggles).

## Quality gate (self-check before persist)
After a generator produces content, the agent self-checks against `quality-guide` +
structural validity + language match. On failure it revises (bounded retries); if still
failing, the handler persists with `status=needs_review` and `review_flags=[failed criteria]`
— never `approved` (FR-018).

## Loop bounds
`MAX_TOOL_ROUNDS` caps tool iterations per request; exceeding it ends the turn with an error
event and persists no partial document as complete (FR-020).
