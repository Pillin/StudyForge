# StudyForge — Skills & Tools Backlog (generalized)

Living registry of planned **skills** (constitution principle II: modular, composable).
Derived from a mature reference skill (`Pillin/skill-create-course`, the "Niñas Pro Course
Creator") but **generalized**: the product is a configurable course-authoring platform, not
a Niñas-Pro / women-in-STEM-specific tool. Niñas-Pro specifics become **optional config /
presets**, never hardcoded.

This is NOT a spec — each item gets its own `/speckit-specify` spec when built. It exists so
ideas aren't lost and the engine's design accounts for every skill's needs (especially
**output format / renderer** and the **authoring workflow**).

## The authoring workflow (the spine)

Generation is a staged process, not a single shot:

1. **Interview / intake** — gather requirements; never assume; a vague answer triggers a
   follow-up. (skill: `interview`)
2. **`course-requirements`** — the formal contract: audience, sessions, time distribution,
   source material assessment, available technology, pedagogical criteria, constraints,
   missing-info resolution.
3. **`main-plan`** — the course blueprint: description, narrative thread (*hilo conductor*),
   session table, time distribution per session type, difficulty progression, accessibility
   plan, technology, and the file tree to be generated.
4. **APPROVAL GATE** — no class material is generated until the user explicitly approves
   `course-requirements` + `main-plan`.
5. **Per-class generation** — generate each class's artifact set in sequence.
6. **Aggregation** — `full-glossary`, `README`, course-level guides.
7. **Packaging** — bundle the course (e.g., `.zip`) and deliver.

## Configuration (per course — replaces hardcoded Niñas-Pro assumptions)

| Setting | Default | Was (Niñas Pro) |
|---|---|---|
| Content language | configurable | Spanish |
| Audience / age range | configurable | girls 13–19, Chile |
| Teaching-role term | configurable (e.g. "teacher") | "mentora" |
| Inclusion / gender perspective | **optional toggle** | transversal, non-negotiable |
| Role-model figure per class | **optional feature** | "STEAM woman" per class, required |
| Citation style | configurable | APA 7 |
| Slide renderer | configurable | `.pptx` (brandbook) |
| Tone preset | configurable | "empowering/warm" |
| Initial/final evaluations | handled by a **separate evaluation skill** | same |

## Governing skills (standards injected into generation)

| Skill | Role | Per-course configurable? | Status |
|---|---|---|---|
| `pedagogical-frameworks` | 5E (primary class structure), Bloom revised (objectives/exercises), UDL/DUA, active learning, PBL. **Internal design tools — never explained to students.** | global standard | Backlog |
| `quality-guide` | acceptance bar all artifacts self-check against before persist; basis of per-class `quality-check` | global standard | Backlog (gate enforced) |
| `tone-and-narrative` | voice/register/narrative continuity; bridges between classes | **yes** (preset) | Backlog |
| `visual-identity` | brand: colors, typography, logo, templates; feeds slide renderer; WCAG AA | **yes** | Backlog |
| `time-distribution` | standard session pacing per session type; resolves duration ambiguity | **yes** | Backlog |
| `technology` | platform-specific handling (auto-judge, browser IDE, offline, none); course-specific, never assumed | **yes** | Backlog |
| `inclusion-policy` | optional gender/representation perspective applied transversally | **optional** | Backlog |

## Generator skills — course level

| Skill | Output / renderer | Notes | Status |
|---|---|---|---|
| `interview` | conversational intake | drives requirements; no assumptions | Backlog |
| `course-requirements` | `course-requirements.md` | the contract; approval artifact | Backlog |
| `main-plan` | `main-plan.md` | the blueprint; approval artifact | Backlog |
| `facilitation-guide` | Markdown facilitator script | course/class facilitation | Backlog |
| `references` | formatted citation list (configurable style, default APA 7) | reliable sources only, never invented | Backlog |
| `assessment-inputs` | `assessment-inputs.md` | **handoff to a separate evaluation skill**; objectives, key concepts, expected skills, common errors, expected difficulty, observable evidence. No quizzes/rubrics here. | Backlog |
| `full-glossary` | aggregated Markdown glossary | built after all class glossaries | Backlog |
| `course-output` / packaging | generation sequence + `README` + `.zip` bundle | orchestration standard | Backlog |

## Generator skills — per class

| Skill | Output / renderer | Notes | Status |
|---|---|---|---|
| `class-overview` | `00-class-overview.md` | the class map: purpose, prev/next bridges, objectives (Bloom-labeled), 5E mapping, key content, main activity, tech, UDL adaptations, inclusion focus, file list | Backlog |
| `slides` | **slide deck** — script (`01-slides.md`) **+ visual artifact** | renderer configurable: **PPTX** (brandbook, default), **Slidev** (Markdown), Canva, Marp. 5E-structured (Engage hook first, never cold lecture). Consumes `visual-identity` + `tone-and-narrative`. | Backlog (renderer TBD) |
| `kahoot` | Kahoot quiz-import spreadsheet (CSV/XLSX) | ≥10 questions, each with explanation, Bloom-labeled; per-class formative evaluation | Backlog |
| `exercises` | Markdown worksheet + **formative rubric (1–10)** + mentor solutions | ≥10 items spanning ≥3 Bloom levels (warm-up/core/challenge); includes a written **reflection** item (the other half of per-class evaluation) | Backlog |
| `glossary` | per-class term/definition data + Markdown | ≥8 terms, full structure | Backlog |
| `role-model` | `05-<figure>.md` | **optional**; real, verifiable figure relevant to class content (not generic bio); cite sources; was "STEAM woman" | Backlog (optional) |
| `figures-registry` | dedup registry across courses | **optional**; supports `role-model`; avoid repetition/diversity | Backlog (optional) |
| `preparation-checklist` | `06-preparation-checklist.md` | logistics + pedagogy prep | Backlog |
| `quality-check` | `07-quality-check.md` | per-class verification checklist (alignment, Bloom, 5E, UDL, slides, mandatory materials) — operationalizes `quality-guide` | Backlog |

## Out of scope for THIS skill (separate, referenced)

- **Evaluation skill** — generates **initial / final evaluations**, quizzes, and rubrics from
  `assessment-inputs.md`. This is where the user's original "Diagnostic Assessment (initial,
  final)" actually lives. The course-authoring app produces the *inputs*; the evaluation
  skill produces the *assessments*. (Per-class assessment = Kahoot + reflection, built in.)

## Open ideas

- Alternative slide renderers beyond the chosen default.
- Additional skills: `rubric` (standalone), `lesson-plan`, `case-studies`,
  `accessibility-checklist`.
- Source-material ingestion: read a provided PDF/slides/syllabus critically as *input*
  (reorganize/improve/replace), not as a script. (Was a first-class feature of the reference
  skill; revisit vs the earlier "no RAG in v1" assumption.)

> Sequencing question (for realignment): the true backbone is the **interview →
> requirements → main-plan → approval** workflow, plus the per-class generator set. The
> current Spec 001 (foundation + diagnostic-assessment) predates this analysis and needs
> realignment — see the realignment decision in the conversation.
