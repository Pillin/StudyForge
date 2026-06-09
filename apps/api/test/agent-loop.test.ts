import { describe, it, expect } from "vitest";
import { runAgentTurn, type ToolOutcome } from "../src/agent/loop.js";
import type { OpenRouter, StreamDelta } from "../src/agent/openrouter.js";
import type { SSEEvent, SSEStream } from "../src/agent/sse.js";
import { validRequirements } from "./helpers.js";

/** A scripted OpenRouter: round 1 requests a tool, round 2 finishes with text. */
function fakeClient(): OpenRouter {
  let round = 0;
  const stream = async function* (): AsyncGenerator<StreamDelta> {
    round++;
    if (round === 1) {
      yield { content: "Listo, registro los requisitos. " };
      yield {
        toolCalls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "emit_course_requirements",
              arguments: JSON.stringify(validRequirements),
            },
          },
        ],
        finishReason: "tool_calls",
      };
    } else {
      yield { content: "He guardado el documento.", finishReason: "stop" };
    }
  };
  return { stream } as unknown as OpenRouter;
}

function captureSSE(events: SSEEvent[]): SSEStream {
  return {
    response: new Response(),
    async send(e) {
      events.push(e);
    },
    async close() {},
  };
}

describe("agent loop (covers US1/US2 generation orchestration)", () => {
  it("streams text, dispatches the tool, then completes", async () => {
    const events: SSEEvent[] = [];
    const sse = captureSSE(events);
    let handledArgs = "";

    const result = await runAgentTurn({
      client: fakeClient(),
      system: "system",
      history: [{ role: "user", content: "Curso de prueba" }],
      tools: [],
      sse,
      handle: async (toolName, argsJson): Promise<ToolOutcome> => {
        expect(toolName).toBe("emit_course_requirements");
        handledArgs = argsJson;
        return { documentId: "doc1", version: 1, status: "draft" };
      },
    });

    expect(result.toolRan).toBe(true);
    expect(JSON.parse(handledArgs)).toMatchObject({ general_data: expect.any(String) });
    expect(events.some((e) => e.type === "tool_start")).toBe(true);
    expect(events.some((e) => e.type === "tool_result")).toBe(true);
    expect(events.some((e) => e.type === "token")).toBe(true);
    expect(result.assistantText).toContain("guardado");
  });
});
