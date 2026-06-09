# Feature Specification: Foundation Vertical Slice — Course Authoring + Diagnostic Assessment

**Feature Branch**: `001-foundation-diagnostic-slice`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Foundation vertical slice: course-authoring agent engine (model loop with tools + injected skills), Course→Class→Artifact data model, auth port with session stub, minimal web UI, and the diagnostic-assessment generator skill end-to-end (initial, per-class, final)."

## Overview

StudyForge is an AI teacher that authors pedagogically-grounded course material. This
first slice proves the end-to-end architecture by delivering one complete capability: an
authenticated educator describes a course, and the agent produces **diagnostic
assessments** — an initial (course-entry) diagnostic, a per-class diagnostic, and a final
(course-exit) diagnostic — that are grounded in Bloom's taxonomy, aligned to stated
learning objectives, quality-checked, written in the course's chosen language, and saved
for later review. It establishes the engine (agent + modular skills + tools), the
Course→Class→Artifact data model, the authentication boundary, and a minimal UI that all
future skills reuse.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a course's diagnostic assessments (Priority: P1)

An educator signs in, creates a course by giving its subject, target audience/level, and
content language, and adds one or more classes (sessions) with their topics. They ask the
agent to produce the course's diagnostic assessments. The agent returns an **initial**
diagnostic for the whole course, a **per-class** diagnostic for each class, and a
**final** diagnostic for course exit — each a set of questions mapped to learning
objectives and Bloom cognitive levels, in the course's language.

**Why this priority**: This is the core value and the proof of the whole architecture
(agent engine + a generator skill + pedagogical grounding + quality gate + persistence).
Without it there is no product.

**Independent Test**: Sign in, create a course with two classes, request diagnostics, and
verify three kinds of diagnostic are produced (initial, per-class ×2, final), each with
questions tied to objectives and labeled Bloom levels, in the selected language.

**Acceptance Scenarios**:

1. **Given** a signed-in educator with a course defined (subject, level, language) and two
   classes, **When** they request the course's diagnostics, **Then** the system produces
   one initial diagnostic, one diagnostic per class, and one final diagnostic.
2. **Given** a generated diagnostic, **When** the educator inspects any question, **Then**
   each question states the learning objective it assesses and its Bloom cognitive level.
3. **Given** a course whose language is set to Spanish, **When** diagnostics are generated,
   **Then** all question and answer content is in Spanish.
4. **Given** a generated diagnostic, **When** it is presented, **Then** it conforms to a
   consistent, structured format (stem, options/expected response, correct answer,
   objective, Bloom level) for every question.

### User Story 2 - Save, list, and reopen generated material (Priority: P2)

Generated diagnostics are saved under the course and the owning educator. The educator can
return later, see their courses and the artifacts in each, and reopen any diagnostic to
read it in a clean rendered view.

**Why this priority**: Persistence and retrieval make the output a usable product rather
than a throwaway chat, and exercises the data model every future skill writes to.

**Independent Test**: Generate diagnostics, reload the app, navigate to the course, and
confirm the saved diagnostics are listed and individually viewable with content intact.

**Acceptance Scenarios**:

1. **Given** an educator who generated diagnostics earlier, **When** they return and open
   the course, **Then** the previously generated diagnostics are listed with their type
   (initial/per-class/final) and title.
2. **Given** a saved diagnostic, **When** the educator opens it, **Then** the full
   structured content is rendered readably.
3. **Given** two different educators, **When** each views their courses, **Then** each sees
   only their own courses and artifacts.

### User Story 3 - Watch generation progress live (Priority: P3)

While the agent works, the educator sees progress stream in real time rather than waiting
in front of a blank screen, including when the agent is performing a step such as saving an
artifact.

**Why this priority**: Generation can take many seconds; live feedback materially improves
the experience but the feature is usable without it.

**Independent Test**: Trigger a generation and observe incremental output appearing before
the final result is complete.

**Acceptance Scenarios**:

1. **Given** a generation in progress, **When** the agent is producing content, **Then**
   partial output is shown incrementally until completion.
2. **Given** a generation that fails partway, **When** the error occurs, **Then** the
   educator sees a clear message and no partial artifact is saved as if complete.

### Edge Cases

- **Underspecified course**: subject given but no learning objectives — the agent derives
  provisional objectives and labels them as inferred rather than failing.
- **Quality-gate failure**: a generated diagnostic fails the acceptance bar (e.g., a
  question has no clear objective or correct answer) — it is revised or flagged, never
  saved as if it passed.
- **Invalid/incomplete agent output**: the agent's structured output does not satisfy the
  diagnostic format — it is rejected and regenerated, not stored malformed.
- **Language mismatch**: the agent produces content in a language other than the course's
  configured language — this fails the quality gate and is corrected.
- **Empty course**: a course with no classes — the initial and final course-level
  diagnostics can still be produced; per-class diagnostics are simply absent.
- **Unauthenticated access**: a request without a valid session cannot create courses or
  generate/read artifacts.
- **Long-running or interrupted generation**: a generation that exceeds reasonable time or
  is interrupted leaves no half-saved artifact.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & ownership**
- **FR-001**: System MUST allow an educator to authenticate and MUST associate every course
  and artifact with the owning educator.
- **FR-002**: System MUST prevent any user from viewing or modifying courses and artifacts
  they do not own.
- **FR-003**: Authentication MUST be defined as a replaceable boundary so the underlying
  mechanism can change later without affecting course or artifact behavior.

**Course & class modeling**
- **FR-004**: Educators MUST be able to create a course specifying at minimum its subject,
  target audience/level, and content language.
- **FR-005**: Educators MUST be able to add classes (sessions) to a course, each with a
  topic.
- **FR-006**: System MUST allow optional learning objectives to be provided per course
  and/or per class; when absent, the agent MUST derive provisional objectives.

**Agent engine, skills & tools**
- **FR-007**: System MUST provide an agent that, given a course/class context, generates
  study material by following modular skills.
- **FR-008**: System MUST treat capabilities as modular skills such that adding a new skill
  requires only a new skill definition and registry entry, with no change to the agent
  engine.
- **FR-009**: Generator skills MUST be invokable by the agent as discrete actions (tools),
  and governing standards (pedagogical frameworks, quality, tone, visual identity) MUST be
  applied to the agent's behavior for the relevant step.
- **FR-010**: The agent MUST emit generated artifacts in a structured, validated form
  matching the target artifact's defined format; output that does not conform MUST be
  rejected and regenerated rather than stored.

**Diagnostic-assessment skill (the slice's generator)**
- **FR-011**: System MUST generate three diagnostic scopes: an **initial** course-entry
  diagnostic, a **per-class** diagnostic for each class, and a **final** course-exit
  diagnostic.
- **FR-012**: Each diagnostic MUST consist of questions where every question states the
  learning objective it assesses and its Bloom cognitive level.
- **FR-013**: Each question MUST include a clearly identified correct answer (or expected
  response) and, where applicable, answer options.
- **FR-014**: All generated diagnostic content MUST be in the course's configured content
  language.
- **FR-015**: Generated diagnostics MUST be checked against an explicit quality acceptance
  bar before being saved; failing diagnostics MUST be revised or flagged, never saved as
  passing.

**Persistence & retrieval**
- **FR-016**: System MUST persist generated diagnostics under their course and owning
  educator, recording the diagnostic type and a title.
- **FR-017**: Educators MUST be able to list their courses, list the artifacts within a
  course, and reopen any saved artifact to view its full content.
- **FR-018**: A generation that fails or is interrupted MUST NOT leave a partially-saved
  artifact presented as complete.

**Feedback**
- **FR-019**: System SHOULD present generation progress to the educator incrementally while
  the agent works.

### Key Entities *(include if feature involves data)*

- **Educator (User)**: The owner/author. Has identity and owns courses.
- **Course**: A unit of instruction. Attributes: subject, target audience/level, content
  language, optional course-level learning objectives. Owned by one educator; contains
  classes and artifacts.
- **Class**: A session within a course. Attributes: topic, optional class-level objectives,
  ordering within the course.
- **Learning Objective**: A statement of intended learning, associated with a Bloom
  cognitive level; may be authored or agent-derived (flagged as inferred).
- **Artifact**: A generated deliverable belonging to a course (and optionally a class).
  Attributes: type (for this slice: diagnostic-assessment), scope (initial / per-class /
  final), title, structured content, creation time, owning educator.
- **Diagnostic Question** (within a diagnostic artifact): stem, optional options, correct
  answer/expected response, assessed objective, Bloom level.
- **Skill (registry concept)**: A modular capability the agent can apply; generator skills
  produce artifacts, governing skills define standards. Discoverable from a registry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a defined course with two classes, an educator obtains a complete set of
  diagnostics (1 initial + 2 per-class + 1 final) in a single generation request.
- **SC-002**: 100% of saved diagnostic questions carry both an associated learning objective
  and a Bloom cognitive level.
- **SC-003**: 100% of saved diagnostic content is in the course's configured language.
- **SC-004**: 0% of saved artifacts are malformed (every saved artifact conforms to the
  defined diagnostic format).
- **SC-005**: An educator can create a course and generate its first diagnostic in under 5
  minutes of hands-on effort (excluding model generation time).
- **SC-006**: After reloading the application, 100% of previously generated diagnostics
  remain listed and openable with content intact, and visible only to their owner.
- **SC-007**: A second, unrelated generator skill can be added later by adding only a skill
  definition and a registry entry, with no modification to the agent engine (validated when
  the next skill is built).

## Assumptions

- **Scope of this slice**: only the diagnostic-assessment generator skill is implemented;
  other skills (exercise guide, glossary, kahoot, slides, facilitation guide,
  lessons-learned, references, and the governing skills beyond what diagnostics needs) are
  out of scope here and added as separate specs.
- **Out of scope for v1 product**: document/PDF upload and retrieval-augmented teaching, and
  spaced-repetition/mastery tracking over time.
- **Authentication**: v1 ships a minimal session-based sign-in behind the auth boundary; a
  managed provider (e.g. WorkOS) may replace it later via the same boundary.
- **Single-owner courses**: a course is owned and edited by one educator; collaboration and
  sharing are out of scope for this slice.
- **Pedagogical frameworks**: Bloom is applied to objectives/questions in this slice; 5E and
  UDL are represented in the governing pedagogical-frameworks standard and applied more
  fully by later skills, but diagnostics minimally respect UDL (clear, accessible item
  wording).
- **Default question style**: where unspecified, diagnostics mix selected-response and
  short constructed-response items appropriate to the Bloom levels of the objectives.
- **Connectivity**: educators have stable internet; generation is an online operation.
