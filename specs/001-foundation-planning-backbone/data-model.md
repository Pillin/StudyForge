# Phase 1 Data Model — Course Planning Backbone

Storage: Cloudflare D1 (SQLite) via Drizzle. JSON columns hold schema-validated structured
content (validated by Zod in `packages/shared` before write). IDs are text (UUID/ULID).

## Entities

### `users`
| Field | Type | Notes |
|---|---|---|
| id | text PK | |
| email | text UNIQUE | login identity |
| password_hash | text | session-stub auth (v1) |
| created_at | integer | epoch ms |

### `sessions` (auth)
| Field | Type | Notes |
|---|---|---|
| token | text PK | opaque; set as HttpOnly cookie |
| user_id | text FK→users.id | |
| expires_at | integer | |

> Owned by the `AuthPort` implementation; swapping to WorkOS replaces this table's role.

### `courses`
| Field | Type | Notes |
|---|---|---|
| id | text PK | |
| user_id | text FK→users.id | owner (FR-001/002) |
| subject | text | |
| audience | text | configurable (FR-004) |
| age_range | text | |
| language | text | content language (enforced) |
| role_term | text | e.g. "teacher"/"mentora" |
| config | text (JSON) | tone_preset, citation_style, inclusion_enabled, role_model_enabled, session_count, session_durations[] |
| ready_state | text enum | `draft` · `interviewing` · `awaiting_approval` · `ready` |
| created_at / updated_at | integer | |

### `interview_sessions`
| Field | Type | Notes |
|---|---|---|
| id | text PK | |
| course_id | text FK→courses.id | one active per course |
| transcript | text (JSON) | ordered messages (role, content) |
| coverage | text (JSON) | required-topic → covered/missing/resolved (FR-010/011) |
| status | text enum | `in_progress` · `complete` |
| created_at / updated_at | integer | |

### `documents` (versioned)
| Field | Type | Notes |
|---|---|---|
| id | text PK | |
| course_id | text FK→courses.id | |
| type | text enum | `course_requirements` · `main_plan` |
| version | integer | sequential per (course_id, type); UNIQUE(course_id,type,version) (FR-017) |
| status | text enum | `draft` · `needs_review` · `approved` (FR-018) |
| origin | text enum | `agent` · `manual` (FR-017a) |
| content | text (JSON) | structure validated by the type's Zod schema |
| review_flags | text (JSON, nullable) | failed quality criteria when `needs_review` |
| created_at | integer | |

**Latest version** of a (course,type) = max(version). Course readiness is derived: `ready`
iff the latest `course_requirements` AND latest `main_plan` are both `approved`.

A `course_requirements` document is **complete** when its latest version's `status` is
`draft` or `approved` (i.e. **not** `needs_review`). `main_plan` generation requires a
complete `course_requirements` (FR-016).

### Embedded: `PlannedSession` (inside `main_plan.content`, not a table)
Validated array element: `{ ordinal, title, central_content, session_type, objectives:
[{ statement, bloom_level }], notes? }`.

## Relationships

```
users 1──* courses 1──1 interview_session
                  1──* documents (type ∈ {course_requirements, main_plan}, multiple versions)
main_plan.content.sessions[] : embedded PlannedSession[]
```

## Course readiness state machine (FR-016 / 016a)

```
draft ──(start interview)──▶ interviewing
interviewing ──(interview complete → generate requirements → generate main_plan)──▶ awaiting_approval
awaiting_approval ──(approve: set latest requirements & main_plan = approved)──▶ ready
ready ──(new version of either doc, via regenerate OR manual edit)──▶ awaiting_approval   [approval revoked, FR-016a]
any ──(quality gate fails after retries)──▶ latest doc status = needs_review (course stays not-ready)
```

- Per-class generation is permitted **only** in `ready` (FR-016, SC-004); the guarded
  endpoint returns 409 otherwise.
- Creating a new version (any origin) sets that doc's latest status to `draft`/`needs_review`
  and moves the course out of `ready`.

## Validation rules (enforced before persist)

- `documents.content` MUST validate against its type's Zod schema or the write is rejected
  and regenerated (agent) / rejected or flagged `needs_review` (manual edit) — FR-009/017a.
- `course_requirements.content` MUST include the contract sections and a `missing_info[]`
  list with each item's resolution (FR-012, SC-002).
- `main_plan.content` MUST include: description, narrative_thread, sessions[] (each objective
  with observable verb + bloom_level), time_distribution per session_type (each summing to
  the configured duration — SC-003), difficulty_progression, accessibility_plan, technology,
  planned_files[] (FR-013/014/015).
- All persisted document text MUST be in `courses.language` (quality gate; SC-006).
- Quality-gate failure after retries ⇒ `status = needs_review` + `review_flags` populated;
  never `approved` (FR-018).
