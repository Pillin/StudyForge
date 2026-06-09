# StudyForge — Skills & Tools Backlog

This is the living registry of planned **skills** (per constitution principle II: modular,
composable). It is NOT a spec — each skill gets its own `/speckit-specify` spec when built.
It exists so we don't lose ideas and so the engine's design accounts for every skill's
needs (especially **output format / renderer**).

Each skill is one of two kinds:
- **Generator** — invoked by the agent as a **tool**; produces a deliverable artifact in a
  concrete, usable **output format**.
- **Governing** — **injected** into the agent's prompt as a standard the generators obey.

A skill folder = `SKILL.md` (instructions) + `schema` (validated structured output) +
`renderer/output-format` (the concrete artifact it emits) + optional `templates/` +
`examples/`. Adding a skill or a new output format must require **no change to the agent
engine** — only a new folder + a registry entry.

## Generator skills

| Skill | Scope | Structured output | Output format / renderer (tool target) | Status |
|---|---|---|---|---|
| `diagnostic-assessment` | initial · per-class · final | questions (item type, stem, options, answer, objective, Bloom) | rendered Markdown (printable); auto-gradable export later | **Spec 001 (in progress)** |
| `slides` | per class | slide deck model (sections, bullets, speaker notes) | **Slidev Markdown** (frontmatter + `---` separators); consumes `visual-identity` theme + `tone-and-narrative`. Future renderers: Marp / Reveal / PPTX export | Backlog |
| `kahoot` | per class | quiz items (question, answers, correct, time) | **Kahoot quiz-import spreadsheet** (CSV/XLSX rows) | Backlog |
| `exercise-guide` | per class | exercises (prompt, steps, solution, difficulty, objective) | Markdown worksheet (+ separate answer key) | Backlog |
| `facilitation-guide` | per class / course | timed agenda, talking points, transitions, checks-for-understanding | Markdown facilitator script | Backlog |
| `glossary` | course | terms (term, definition, example, related) | structured data + Markdown glossary | Backlog |
| `references` | course | citations (source, type, locator) | formatted citation list (e.g., APA) | Backlog |
| `lessons-learned` | per class / course retro | observations, what-worked, adjustments | Markdown retro | Backlog |

## Governing skills (standards injected into generation)

| Skill | Role | Per-course variable? | Status |
|---|---|---|---|
| `pedagogical-frameworks` | 5E (Engage/Explore/Explain/Elaborate/Evaluate), Bloom levels, UDL principles | global standard | Backlog (Bloom subset used by 001) |
| `quality-guide` | acceptance bar all artifacts self-check against before persist | global standard | Backlog (gate enforced by 001) |
| `tone-and-narrative` | voice/register/narrative style | **yes** | Backlog |
| `visual-identity` | colors, typography, imagery guidance; feeds `slides`/visual renderers (e.g., Slidev theme vars) | **yes** | Backlog |

## Open ideas (not yet committed)

- Additional generator skills as needed: `rubric`, `lesson-plan`, `case-studies`,
  `accessibility-checklist`, `answer-key`.
- Alternative slide renderers: Marp, Reveal.js, direct PPTX export.
- Export bundle: package a whole course's artifacts (slides + guides + assessments) into a
  single downloadable archive.

> Sequencing: build the engine + `diagnostic-assessment` first (Spec 001) to prove the
> skill/tool/renderer pattern, then add skills one spec at a time. `slides` (Slidev) is a
> strong candidate for Spec 002 because it exercises the output-format/renderer concept and
> the `visual-identity` + `tone-and-narrative` governing skills.
