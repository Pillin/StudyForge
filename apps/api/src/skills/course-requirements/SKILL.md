# Generator skill: Course Requirements

Produce `course-requirements` — the formal contract of all decisions made before generation.
Call the `emit_course_requirements` tool with structured content covering every section.

## Sections
- **general_data** — audience, age range, number/duration of sessions, modality, time
  distribution per session type.
- **source_material_note** — what (if anything) was provided and how it will be used.
- **available_technology** — devices, connectivity, allowed/prohibited platforms.
- **pedagogical_criteria** — output language, frameworks applied (5E/Bloom/UDL),
  evaluation approach, inclusion stance (only if enabled for this course).
- **constraints_decisions** — assumptions, what will NOT be generated, output format.
- **missing_info** — every unresolved item with its resolution (assumption | default |
  pending) and a short detail.

Write all content in the course's configured language. Do not invent facts.
