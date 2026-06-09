import type { OpenRouter, ChatMessage, ToolDef, ToolCall } from "./openrouter.js";
import type { SSEStream } from "./sse.js";

export interface ToolOutcome {
  documentId: string;
  version: number;
  status: string;
  flags?: string[];
}

/** Thrown by a handler when the model should retry with corrected arguments. */
export class RetryableToolError extends Error {}

/**
 * A tool handler validates+persists a generator's output and returns the outcome.
 * Throw RetryableToolError to let the model correct itself; other throws abort.
 */
export type ToolHandler = (toolName: string, argsJson: string) => Promise<ToolOutcome>;

const DEFAULT_MAX_ROUNDS = 4;

/**
 * Run one agent turn: stream text, execute tool calls (bounded), emit SSE.
 * Returns the final assistant text. On hard failure, emits an `error` event and
 * persists nothing as complete (FR-020) — the caller closes the stream.
 */
export async function runAgentTurn(opts: {
  client: OpenRouter;
  system: string;
  history: ChatMessage[];
  tools: ToolDef[];
  handle: ToolHandler;
  sse: SSEStream;
  maxRounds?: number;
}): Promise<{ assistantText: string; toolRan: boolean }> {
  const { client, system, tools, handle, sse } = opts;
  const maxRounds = opts.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const messages: ChatMessage[] = [{ role: "system", content: system }, ...opts.history];

  let finalText = "";
  let toolRan = false;

  for (let round = 0; round < maxRounds; round++) {
    let roundText = "";

    // stream this round
    const toolCalls = await collect(client, messages, tools, async (text) => {
      roundText += text;
      await sse.send({ type: "token", text });
    });

    if (!toolCalls.length) {
      finalText += roundText;
      return { assistantText: finalText, toolRan };
    }

    // record the assistant turn that requested tools
    messages.push({ role: "assistant", content: roundText || null, tool_calls: toolCalls });

    for (const tc of toolCalls) {
      await sse.send({ type: "tool_start", tool: tc.function.name, label: tc.function.name });
      try {
        const outcome = await handle(tc.function.name, tc.function.arguments);
        toolRan = true;
        await sse.send({
          type: "tool_result",
          tool: tc.function.name,
          documentId: outcome.documentId,
          version: outcome.version,
          status: outcome.status,
        });
        await sse.send({
          type: "quality",
          status: outcome.status,
          ...(outcome.flags ? { flags: outcome.flags } : {}),
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(outcome),
        });
      } catch (err) {
        if (err instanceof RetryableToolError) {
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify({ error: err.message, retry: true }),
          });
          continue; // let the model correct itself next round
        }
        throw err;
      }
    }
  }

  return { assistantText: finalText, toolRan };
}

async function collect(
  client: OpenRouter,
  messages: ChatMessage[],
  tools: ToolDef[],
  onText: (t: string) => Promise<void>,
): Promise<ToolCall[]> {
  const toolCalls: ToolCall[] = [];
  for await (const delta of client.stream(messages, tools)) {
    if (delta.content) await onText(delta.content);
    if (delta.toolCalls) toolCalls.push(...delta.toolCalls);
  }
  return toolCalls;
}
