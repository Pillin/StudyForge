import { apiBase } from "./api.js";

export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

/** POST to an SSE endpoint and invoke onEvent for each parsed event. */
export async function postSSE(
  path: string,
  body: unknown,
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  const res = await fetch(apiBase + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed: ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(t.slice(5).trim()) as SSEEvent);
      } catch {
        // ignore partial/non-JSON keepalives
      }
    }
  }
}
