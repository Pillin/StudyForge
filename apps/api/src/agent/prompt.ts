import { GOVERNING_SKILLS } from "./registry.js";

export interface CourseContext {
  subject: string;
  audience: string;
  ageRange: string;
  language: string;
  roleTerm: string;
  tonePreset: string;
  citationStyle: string;
  inclusionEnabled: boolean;
  roleModelEnabled: boolean;
  sessionCount: number;
  sessionDurations: number[];
}

const BASE = `You are StudyForge, an AI instructional designer. You author pedagogically
grounded course material through a plan-then-generate workflow. You act in the role term the
course configures (e.g. "teacher"/"mentora"). Always write learner- and educator-facing
content in the course's configured language. Pedagogical frameworks are internal design
tools — never explain them to students in the output. Never invent sources or facts.`;

/** Assemble the system prompt: base + course config + governing skills + phase instructions. */
export function assembleSystemPrompt(ctx: CourseContext, phaseInstructions: string): string {
  const config = [
    `## Course configuration`,
    `- Subject: ${ctx.subject}`,
    `- Audience: ${ctx.audience} (age range: ${ctx.ageRange})`,
    `- Content language: ${ctx.language} (ALL generated content must be in this language)`,
    `- Teaching-role term: ${ctx.roleTerm}`,
    `- Tone preset: ${ctx.tonePreset}`,
    `- Citation style: ${ctx.citationStyle}`,
    `- Inclusion/representation perspective: ${ctx.inclusionEnabled ? "ENABLED" : "OFF"}`,
    `- Role-model feature: ${ctx.roleModelEnabled ? "ENABLED" : "OFF"}`,
    `- Sessions: ${ctx.sessionCount}; durations (min): ${ctx.sessionDurations.join(", ")}`,
  ].join("\n");

  const governing = GOVERNING_SKILLS.map(
    (s) => `## ${s.name}\n${s.instructions.trim()}`,
  ).join("\n\n");

  return [BASE, config, governing, `## Current task\n${phaseInstructions.trim()}`].join("\n\n");
}
