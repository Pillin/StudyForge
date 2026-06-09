# Feature Specification: Foundation Vertical Slice — Course Planning Backbone

**Feature Branch**: `001-foundation-planning-backbone`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Foundation vertical slice: course-authoring agent engine (model loop with tools + injected governing skills), Course→Session data model, auth port with session stub, minimal web UI, and the plan-then-generate backbone — guided interview → course-requirements → main-plan → explicit approval gate. No per-class generators yet; no zip; no PPTX."

## Overview

StudyForge is an AI teacher that authors pedagogically-grounded course material for any
subject and audience (configurable; not tied to one mission). This first slice proves the
end-to-end architecture by delivering the **planning backbone** that everything else hangs
off: an authenticated educator configures a course, the agent runs a **guided requirements
interview** (never assuming), and produces two reviewable documents — **course-requirements**
(the contract) and **main-plan** (the pedagogical blueprint) — which the educator must
**explicitly approve** before any class material can ever be generated. It establishes the
agent engine (conversation + modular skills + tools + injected governing standards), the
Course→Session data model, the authentication boundary, document versioning + quality gate,
and a minimal UI. Per-class generators (slides, kahoot, exercises, glossary, evaluations,
etc.) are out of scope here and added as later specs that consume the approved plan.

## Clarifications

### Session 2026-06-09

- Q: When the agent regenerates a planning document the course already has, what happens? → A: Each generation creates a new versioned document; prior versions are retained and viewable.
- Q: If a planning document fails the quality gate after the agent's revision attempts, what should happen? → A: Persist it marked "needs review" with the specific failed criteria; never silently discard or silently pass.
- Q: What does the approval gate cover, and when is the main-plan generated? → A: The agent generates course-requirements then the main-plan from the completed requirements; a single explicit approval of both documents unlocks per-class generation.
- Q: If an approved document is later regenerated or changed, what happens to approval? → A: It revokes approval — the course returns to "needs approval" and per-class generation is blocked until re-approved.
- Q: How can an educator change a generated document? → A: Both — request agent-mediated revisions (natural language → regenerated version) AND directly hand-edit the document; either way a new version is created and must still pass structural validation.
- Q: How structured is the requirements interview? → A: Standardized coverage with adaptive delivery — the agent MUST cover a defined required-topic set, asked conversationally.
- Note (realignment 2026-06-09): this feature was previously scoped as a diagnostic-assessment generator. Per project decisions, the first slice is now the plan-then-generate backbone; initial/final evaluations are produced later by separate dedicated evaluation skills, and per-class formative assessment lives in the Kahoot + reflection of later per-class skills. Earlier diagnostic-specific clarifications (item count, item types) no longer apply to this slice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guided requirements interview → the contract (Priority: P1)

An educator signs in and starts a new course, providing its configuration (subject, target
audience and age range, content language, teaching-role term, and other presets). The agent
conducts a **structured interview**, asking about session count and duration, time
distribution, learning context, mandatory/excluded topics, available technology, and any
special sessions. It **never assumes** — a vague answer prompts a follow-up — and it tracks
information that is still missing. From the interview it produces a **course-requirements**
document: the formal contract of all decisions.

**Why this priority**: The interview + requirements contract is the foundation of the
plan-then-generate workflow and the proof of the conversational agent engine. Nothing can be
planned or generated correctly without it.

**Independent Test**: Sign in, start a course, answer the interview (including a deliberately
vague answer), and verify the agent asks a follow-up, records unresolved items, and produces
a course-requirements document covering all required sections.

**Acceptance Scenarios**:

1. **Given** a signed-in educator starting a new course, **When** they begin, **Then** the
   agent conducts an interview covering course identity, time/schedule, learning context,
   content, technology, and special sessions.
2. **Given** the educator gives a vague or incomplete answer, **When** the agent processes
   it, **Then** the agent asks a targeted follow-up rather than proceeding on an assumption.
3. **Given** information the educator cannot provide, **When** the interview completes,
   **Then** the missing items are explicitly recorded (with the assumption or default
   applied) in the course-requirements document.
4. **Given** a completed interview, **When** the requirements are produced, **Then** the
   document contains the contract sections (general data, source-material note, available
   technology, pedagogical criteria, constraints/decisions, missing-info resolution) in the
   course's configured language.

### User Story 2 - Generate the main plan (the blueprint) (Priority: P1)

From the course-requirements, the agent generates a **main-plan**: a complete pedagogical
blueprint detailed enough that anyone could understand the course without reading individual
class files — including the narrative thread, a session-by-session table, time distribution
per session type, difficulty progression, accessibility plan, technology, and the list of
files that would be generated.

**Why this priority**: The main-plan is the approval artifact and the binding contract every
future per-class generator consumes. It exercises the governing standards (pedagogical
frameworks, time distribution, tone, visual identity) as injected design tools.

**Independent Test**: From a course-requirements document, generate the main-plan and verify
it contains the narrative thread, a session table with one row per session, per-session-type
time distribution, a difficulty progression, an accessibility plan, and the planned file
list.

**Acceptance Scenarios**:

1. **Given** a completed course-requirements document, **When** the educator requests the
   plan, **Then** a main-plan is produced from it with all required sections.
2. **Given** a generated main-plan, **When** the educator inspects it, **Then** every
   session objective uses an observable-action verb and states its Bloom level, and the
   pedagogical frameworks are applied as design structure but are not presented as content
   to be taught to students.
3. **Given** a generated main-plan, **When** time distribution is shown, **Then** it sums to
   the configured session duration for each session type.

### User Story 3 - Approval gate and revision loop (Priority: P1)

The educator reviews the course-requirements and main-plan, and either **approves** them or
**requests changes**. No per-class material can be generated until both are approved. Each
regeneration creates a new version; prior versions are retained and viewable. Approval
status is tracked per document.

**Why this priority**: The approval gate is a non-negotiable principle of the platform and
the safety mechanism that prevents wasted downstream generation on an unapproved plan.

**Independent Test**: Generate requirements + plan, attempt to proceed to per-class
generation before approval (must be blocked), request a revision (new version created),
approve both, and confirm the course is then marked ready for generation.

**Acceptance Scenarios**:

1. **Given** an unapproved course, **When** anything attempts downstream per-class
   generation, **Then** it is blocked with a clear "awaiting approval" state.
2. **Given** a generated document, **When** the educator requests changes, **Then** a new
   version is created and the prior version remains viewable.
3. **Given** the educator approves both the requirements and the main-plan, **When**
   approval is recorded, **Then** the course is marked ready for per-class generation.

### User Story 4 - Persist, reopen, and watch progress (Priority: P2)

Courses, interview state, and the generated documents are saved under the owning educator,
visible only to them. The educator can return later and reopen any version. While the agent
works, progress streams incrementally.

**Why this priority**: Persistence makes the workflow a usable product; live progress
improves UX but the feature is usable without it.

**Independent Test**: Produce documents, reload the app, reopen the course and a prior
version, and confirm content is intact and private to the owner; trigger a generation and
observe incremental output.

**Acceptance Scenarios**:

1. **Given** an educator who generated documents earlier, **When** they return, **Then**
   their courses and document versions are listed and openable, intact.
2. **Given** two different educators, **When** each views their courses, **Then** each sees
   only their own.
3. **Given** a generation in progress, **When** the agent is producing content, **Then**
   partial output is shown incrementally; a failure shows a clear message and saves no
   partial document as complete.

### Edge Cases

- **Underspecified course**: critical info missing and unobtainable — the agent records it
  as a missing item with the default/assumption applied, rather than silently guessing or
  failing.
- **Vague duration / time distribution**: a common ambiguity (e.g., "1.5h lecture + 1.5h
  exercises with 15 min quiz") — the agent proposes a concrete distribution and confirms
  before recording it.
- **Quality-gate failure**: a produced document fails the acceptance bar after revision
  attempts — it is saved with a "needs review" status listing the failed criteria, never
  silently discarded and never marked as approved-ready.
- **Premature generation attempt**: any attempt to generate per-class material before
  approval is blocked.
- **Editing after approval**: regenerating or hand-editing an already-approved document
  reverts the course to "needs approval" and re-blocks per-class generation.
- **Structure-breaking manual edit**: a direct edit that violates the document's required
  structure is rejected or saved "needs review", never stored as a valid/approvable version.
- **Invalid/incomplete structured output**: a document that does not match its required
  structure is rejected and regenerated, not stored malformed.
- **Language mismatch**: output not in the course's configured language fails the quality
  gate and is corrected.
- **Unauthenticated access**: requests without a valid session cannot create courses,
  interview, generate, or read documents.
- **Interrupted generation**: leaves no half-saved document presented as complete.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & ownership**
- **FR-001**: System MUST allow an educator to authenticate and MUST associate every course
  and document with the owning educator.
- **FR-002**: System MUST prevent any user from viewing or modifying courses and documents
  they do not own.
- **FR-003**: Authentication MUST be a replaceable boundary so the mechanism can change later
  without affecting course or document behavior.

**Course configuration (configurable, not hardcoded)**
- **FR-004**: Educators MUST be able to create a course with configuration including at least
  subject, target audience, age range, content language, and teaching-role term; with
  optional presets for tone, citation style, inclusion/representation perspective, and
  role-model features.
- **FR-005**: The system MUST function with optional features (e.g. inclusion/representation,
  role-model) turned off; no audience or mission may be hardcoded into the engine.

**Agent engine, skills & tools**
- **FR-006**: System MUST provide a conversational agent that, following modular skills,
  conducts the interview and generates the planning documents.
- **FR-007**: Adding a new skill MUST require only a new skill definition and registry entry,
  with no change to the agent engine.
- **FR-008**: Generator skills MUST be invokable by the agent as discrete actions (tools);
  governing standards (pedagogical frameworks, time distribution, quality, tone, visual
  identity) MUST be applied to the agent's behavior as injected design tools — and MUST NOT
  be surfaced as content taught to students.
- **FR-009**: The agent MUST emit generated documents in a structured, validated form
  matching the document's required structure; non-conforming output MUST be rejected and
  regenerated, not stored.

**Interview → course-requirements**
- **FR-010**: System MUST conduct a structured intake interview that covers a defined
  required-topic set — course identity, time/schedule (including explicit time-distribution
  clarification), learning context, content (mandatory/excluded topics), technology, and
  special sessions — asked adaptively/conversationally rather than as a fixed form. The
  interview MUST NOT complete until every required topic is covered or explicitly recorded
  as missing.
- **FR-011**: The agent MUST NOT assume missing critical information; a vague answer MUST
  trigger a follow-up, and unresolved items MUST be recorded.
- **FR-012**: System MUST produce a course-requirements document recording all decisions: the
  contract sections, the missing-info resolution, and the configured output language.

**Main-plan**
- **FR-013**: System MUST produce a main-plan blueprint containing at least: course
  description, narrative thread, a session table (one row per session), time distribution per
  session type, difficulty progression, accessibility plan, technology, and the planned file
  list.
- **FR-014**: Session learning objectives in the main-plan MUST use observable-action verbs
  and state their Bloom level; 5E MUST structure the planned class flow.
- **FR-015**: Each session type's time distribution MUST sum to that session's configured
  duration.

**Approval gate, versioning & quality**
- **FR-016**: System MUST generate the main-plan from a **complete** course-requirements
  (latest version not in `needs_review`), and MUST require a single explicit educator
  approval of both documents to unlock per-class generation; until approved, downstream
  per-class generation MUST be blocked.
- **FR-016a**: When an approved document is subsequently regenerated or edited, the system
  MUST revoke the course's approved/ready state and re-block per-class generation until the
  documents are approved again.
- **FR-017**: Regenerating a document MUST create a new version while retaining prior
  versions, which MUST remain viewable.
- **FR-017a**: Educators MUST be able to change a document either by requesting an
  agent-mediated revision (natural-language instructions → a regenerated version) or by
  directly editing its content. Either path MUST create a new version and MUST validate the
  result against the document's required structure; a manual edit that breaks the structure
  MUST be rejected or flagged "needs review", never stored as valid.
- **FR-018**: Generated documents MUST be checked against an explicit quality acceptance bar;
  a document that still fails after revision attempts MUST be persisted with a "needs review"
  status recording the failed criteria, never silently discarded and never marked
  approved-ready.

**Persistence, retrieval & feedback**
- **FR-019**: System MUST persist courses, interview state, and document versions under the
  owning educator and allow listing/reopening them with content intact.
- **FR-020**: A generation that fails or is interrupted MUST NOT leave a partially-saved
  document presented as complete.
- **FR-021**: System SHOULD present generation progress incrementally while the agent works.

### Key Entities *(include if feature involves data)*

- **Educator (User)**: Owner/author; has identity; owns courses.
- **Course**: A unit of instruction with configuration (subject, audience, age range,
  language, role-term, tone preset, citation style, inclusion toggle, role-model toggle,
  session count, session duration[s]); owned by one educator; has an overall approval/ready
  state.
- **Interview Session**: The intake dialogue for a course — questions, answers, and recorded
  missing-info items with their resolution (assumption/default/pending).
- **Course-Requirements Document**: The contract — versioned, with a status (draft /
  needs-review / approved) and structured sections.
- **Main-Plan Document**: The blueprint — versioned, with a status, the narrative thread, a
  set of planned **Sessions**, per-session-type time distributions, difficulty progression,
  accessibility plan, technology, and planned file list.
- **Session (planned)**: A row in the main-plan — title, central content, objectives
  (Bloom-labeled), session type, optional notes. *(A planned session is the unit later
  generated as a "class"; the terms are synonymous in this project.)*
- **Skill (registry concept)**: A modular capability; generator skills produce documents,
  governing skills define injected standards; discoverable from a registry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a signed-in start, an educator can complete the interview and obtain a
  course-requirements document plus a main-plan in a single guided session.
- **SC-002**: 100% of unresolved/missing interview items appear in the requirements document
  with an explicit resolution (assumption, default, or pending).
- **SC-003**: 100% of main-plan session objectives carry an observable-action verb and a
  Bloom level; 100% of per-session-type time distributions sum to the configured duration.
- **SC-004**: 0% of per-class generation can proceed for a course whose requirements and
  main-plan are not both approved.
- **SC-005**: 0% of saved documents are malformed (every saved document conforms to its
  required structure).
- **SC-006**: 100% of document content is in the course's configured language.
- **SC-007**: After reloading, 100% of prior document versions remain listed and openable,
  intact and private to the owner.
- **SC-008**: A new generator skill can later be added by adding only a skill definition and
  a registry entry, with no modification to the agent engine (validated when the next skill
  is built).

## Assumptions

- **Scope of this slice**: only the interview, course-requirements, and main-plan generators
  plus the approval gate are implemented. Per-class generators (slides/Slidev, kahoot,
  exercises, glossary, class-overview, preparation-checklist, quality-check, role-model) and
  the evaluation skills (initial/final) are out of scope here and added as later specs.
- **Out of scope for v1 product**: source-material ingestion (reading/redesigning a provided
  PDF/slides/syllabus), `.zip` packaging, and `.pptx` rendering. Slides will be Slidev
  Markdown in a later slice.
- **Authentication**: v1 ships a minimal session-based sign-in behind the auth boundary; a
  managed provider (e.g. WorkOS) may replace it later via the same boundary.
- **Single-owner courses**: a course is owned and edited by one educator; collaboration is
  out of scope for this slice.
- **Configurability**: audience, language, role-term, tone, inclusion/role-model features are
  per-course configuration with sensible defaults; no audience is hardcoded.
- **Frameworks**: 5E, Bloom, and UDL are applied as internal design tools in the main-plan;
  they are not explained to students in generated material.
- **Connectivity**: educators have stable internet; generation is an online operation.
