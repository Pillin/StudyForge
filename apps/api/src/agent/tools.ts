import { toToolParameters } from "@studyforge/shared";
import type { ToolDef } from "./openrouter.js";
import { GENERATOR_SKILLS, type GeneratorSkill } from "./registry.js";

/** Build OpenRouter tool definitions for a chosen subset of generator skills. */
export function toolDefsFor(skills: GeneratorSkill[]): ToolDef[] {
  return skills.map((s) => ({
    type: "function",
    function: {
      name: s.toolName,
      description: s.description,
      parameters: toToolParameters(s.schema, s.name),
    },
  }));
}

/** All generator tool defs (used when the full toolset is appropriate). */
export function allToolDefs(): ToolDef[] {
  return toolDefsFor(GENERATOR_SKILLS);
}
