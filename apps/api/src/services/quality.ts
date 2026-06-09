import type { z } from "zod";

export interface QualityResult {
  ok: boolean;
  /** Failed criteria (precise paths/messages) when !ok. */
  flags: string[];
  /** Parsed/validated content when ok. */
  parsed?: unknown;
}

/**
 * Structural quality gate (FR-018): validate content against the target schema.
 * The deep language/quality self-check is performed by the agent (quality-guide
 * skill is injected into the prompt); this enforces the machine-checkable bar
 * (structure, required fields, the main-plan time-sum rule via the schema).
 */
export function runQualityGate(schema: z.ZodTypeAny, content: unknown): QualityResult {
  const result = schema.safeParse(content);
  if (!result.success) {
    return {
      ok: false,
      flags: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return { ok: true, flags: [], parsed: result.data };
}
