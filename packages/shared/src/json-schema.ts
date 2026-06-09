import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Convert a Zod schema into a JSON Schema suitable for an OpenRouter tool's
 * `parameters` (Principle III: one schema source for validation + tool defs).
 */
export function toToolParameters(schema: z.ZodTypeAny, name: string): Record<string, unknown> {
  const json = zodToJsonSchema(schema, {
    name,
    target: "openApi3",
    $refStrategy: "none",
  }) as Record<string, unknown>;
  // zod-to-json-schema nests under `definitions[name]` when `name` is given.
  const defs = json["definitions"] as Record<string, unknown> | undefined;
  if (defs && defs[name]) return defs[name] as Record<string, unknown>;
  return json;
}
