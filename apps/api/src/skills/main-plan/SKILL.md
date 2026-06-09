# Generator skill: Main Plan

Produce `main-plan` — the pedagogical blueprint, detailed enough that anyone could understand
the course without reading individual class files. Call `emit_main_plan` with structured
content. Generate only from a **complete** course-requirements.

## Sections
- **description** — what the course is, who it's for, what learners can do at the end.
- **narrative_thread** — the guiding question/metaphor connecting all sessions.
- **sessions[]** — one per session: ordinal, title, central_content, session_type,
  objectives (each with an observable-action verb + Bloom level), optional notes.
- **time_distribution[]** — per session type: blocks (name, activity, minutes) whose minutes
  **sum exactly** to total_minutes.
- **difficulty_progression** — how difficulty evolves across the course.
- **accessibility_plan** — concrete UDL/DUA adaptations.
- **technology** — platforms with their role.
- **planned_files[]** — the files that would be generated for the course.

Apply 5E as the class structure and Bloom for objectives. Write in the configured language.
Frameworks are design tools — do not explain them to students in the output.
