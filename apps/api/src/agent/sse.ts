/** SSE event contract (contracts/sse.md). */
export type SSEEvent =
  | { type: "token"; text: string }
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_result"; tool: string; documentId: string; version: number; status: string }
  | { type: "coverage"; covered: string[]; missing: string[] }
  | { type: "quality"; status: string; flags?: string[] }
  | { type: "done"; readiness?: string }
  | { type: "error"; code: string; message: string };

export interface SSEStream {
  response: Response;
  send(event: SSEEvent): Promise<void>;
  close(): Promise<void>;
}

/** Create a text/event-stream Response plus a writer for emitting events. */
export function createSSE(): SSEStream {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  return {
    response: new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }),
    async send(event: SSEEvent) {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    },
    async close() {
      await writer.close();
    },
  };
}
