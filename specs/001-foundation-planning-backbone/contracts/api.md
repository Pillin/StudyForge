# Contract — HTTP API (`apps/api`)

REST over the Hono Worker. JSON unless noted. All non-auth routes require a valid session
cookie; requests for resources the caller doesn't own return `404` (not `403`, to avoid
leaking existence) per FR-002. Request/response bodies validate against Zod DTOs in
`packages/shared`. Errors: `{ error: { code, message, details? } }`.

## Auth (`AuthPort`-backed)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/signup` | `{ email, password }` | `201` + sets session cookie |
| POST | `/auth/login` | `{ email, password }` | `200` + sets session cookie |
| POST | `/auth/logout` | — | `204`, clears cookie |
| GET | `/auth/me` | — | `200 { userId, email }` / `401` |

## Courses
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/courses` | `CourseConfig` (subject, audience, age_range, language, role_term, config) | `201 { course }` (`ready_state: draft`) |
| GET | `/courses` | — | `200 { courses[] }` (owner's only) |
| GET | `/courses/:id` | — | `200 { course, readiness }` / `404` |

## Interview (US1)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/courses/:id/interview` | — | `200 { transcript, coverage, status }` |
| POST | `/courses/:id/interview/messages` | `{ message }` | **SSE stream** of agent reply (see `sse.md`); updates coverage; may mark `complete` |

Sending the first message transitions the course `draft → interviewing`.

## Documents (US2/US3) — `:type ∈ {course-requirements, main-plan}`
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/courses/:id/documents/:type/generate` | `{ guidance? }` | **SSE stream**; persists a new version; `course_requirements` must exist+complete before `main_plan` (FR-016) |
| GET | `/courses/:id/documents/:type` | — | `200 { document }` (latest version) |
| GET | `/courses/:id/documents/:type/versions` | — | `200 { versions[] }` (metadata) |
| GET | `/courses/:id/documents/:type/versions/:v` | — | `200 { document }` |
| PUT | `/courses/:id/documents/:type` | `{ content }` | manual edit → new version; validates structure → `200 { document }` or `422` (rejected) / `200` with `needs_review` flags (FR-017a) |

Any successful `generate`/`PUT` on an approved doc revokes course readiness → `awaiting_approval` (FR-016a).

## Approval (US3)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/courses/:id/approve` | — | `200 { readiness: "ready" }`; approves the latest versions of **both** documents atomically. `409` if either is missing or `needs_review` |

## Per-class generation guard (proves the gate; no generators in this slice)
| Method | Path | Response |
|---|---|---|
| POST | `/courses/:id/classes/generate` | `409 { error: { code: "AWAITING_APPROVAL" } }` unless `ready_state == ready`; in this slice, when `ready`, returns `501 NOT_IMPLEMENTED` (per-class generators are a later spec) |

## Status codes
`200/201/204` success · `401` unauthenticated · `404` not found / not owned · `409` workflow
conflict (approval gate, ordering) · `422` validation failure · `500` server error.
