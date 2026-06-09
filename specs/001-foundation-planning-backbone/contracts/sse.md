# Contract — SSE Streaming

Streaming endpoints (`/interview/messages`, `/documents/:type/generate`) respond with
`Content-Type: text/event-stream`. Each event is a line `data: <json>\n\n`. The web client
renders incremental progress (FR-021) and applies the final state via TanStack Query.

## Event types (`{ type, ... }`)
| `type` | Payload | Meaning |
|---|---|---|
| `token` | `{ text }` | incremental assistant text (interview reply or generation narration) |
| `tool_start` | `{ tool, label }` | a generator tool began (e.g. `emit_main_plan`) |
| `tool_result` | `{ tool, documentId, version, status }` | tool persisted a version |
| `coverage` | `{ covered[], missing[] }` | interview required-topic coverage update |
| `quality` | `{ status, flags? }` | quality-gate outcome for a just-saved document |
| `done` | `{ readiness? }` | turn finished cleanly |
| `error` | `{ code, message }` | failure; no partial document is left marked complete (FR-020) |

## Guarantees
- A `done` event always terminates a successful stream; an `error` event terminates a failed
  one. Clients treat connection close without `done` as failure.
- `tool_result` is emitted only after the version is durably persisted.
- On `error`, any in-progress document is left as `draft`/`needs_review`, never `approved`.
