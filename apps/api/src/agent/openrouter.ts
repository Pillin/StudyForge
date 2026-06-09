/**
 * OpenRouter client — the ONLY place provider specifics live (Principle VI).
 * OpenAI-compatible Chat Completions with streaming + tool-calling.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface StreamDelta {
  /** Incremental assistant text. */
  content?: string;
  /** Accumulating tool-call fragments. */
  toolCalls?: ToolCall[];
  /** Set on the terminal chunk. */
  finishReason?: string | null;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  /** Stream a completion; yields parsed deltas. */
  async *stream(messages: ChatMessage[], tools?: ToolDef[]): AsyncGenerator<StreamDelta> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        ...(tools && tools.length ? { tools, tool_choice: "auto" } : {}),
      }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status}: ${detail.slice(0, 500)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const toolAcc = new Map<number, ToolCall>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = json.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};
        const out: StreamDelta = { finishReason: choice.finish_reason ?? null };
        if (typeof delta.content === "string" && delta.content.length) {
          out.content = delta.content;
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const acc = toolAcc.get(idx) ?? {
              id: tc.id ?? `call_${idx}`,
              type: "function" as const,
              function: { name: "", arguments: "" },
            };
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.function.name = tc.function.name;
            if (tc.function?.arguments) acc.function.arguments += tc.function.arguments;
            toolAcc.set(idx, acc);
          }
        }
        if (choice.finish_reason === "tool_calls") {
          out.toolCalls = [...toolAcc.values()];
        }
        yield out;
      }
    }
  }
}
