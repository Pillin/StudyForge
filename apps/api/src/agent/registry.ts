import type { z } from "zod";
import { CourseRequirementsContent, MainPlanContent } from "@studyforge/shared";

import pedagogicalFrameworks from "../skills/pedagogical-frameworks/SKILL.md";
import qualityGuide from "../skills/quality-guide/SKILL.md";
import timeDistribution from "../skills/time-distribution/SKILL.md";
import toneAndNarrative from "../skills/tone-and-narrative/SKILL.md";
import visualIdentity from "../skills/visual-identity/SKILL.md";
import interviewMd from "../skills/interview/SKILL.md";
import courseRequirementsMd from "../skills/course-requirements/SKILL.md";
import mainPlanMd from "../skills/main-plan/SKILL.md";

export interface GoverningSkill {
  name: string;
  instructions: string;
}

/** Standards injected into the system prompt (Principle II). */
export const GOVERNING_SKILLS: GoverningSkill[] = [
  { name: "pedagogical-frameworks", instructions: pedagogicalFrameworks },
  { name: "quality-guide", instructions: qualityGuide },
  { name: "time-distribution", instructions: timeDistribution },
  { name: "tone-and-narrative", instructions: toneAndNarrative },
  { name: "visual-identity", instructions: visualIdentity },
];

export interface GeneratorSkill {
  name: string;
  toolName: string;
  description: string;
  instructions: string;
  schema: z.ZodTypeAny;
}

/**
 * Generator skills exposed to the model as tools. Adding a generator = a new
 * entry here + its skill folder + Zod schema — no engine change (Principle II).
 */
export const GENERATOR_SKILLS: GeneratorSkill[] = [
  {
    name: "course-requirements",
    toolName: "emit_course_requirements",
    description:
      "Record the course-requirements contract once the interview has covered the required topics.",
    instructions: courseRequirementsMd,
    schema: CourseRequirementsContent,
  },
  {
    name: "main-plan",
    toolName: "emit_main_plan",
    description: "Produce the main-plan blueprint from a complete course-requirements.",
    instructions: mainPlanMd,
    schema: MainPlanContent,
  },
];

export const INTERVIEW_INSTRUCTIONS = interviewMd;

export function generatorByTool(toolName: string): GeneratorSkill | undefined {
  return GENERATOR_SKILLS.find((g) => g.toolName === toolName);
}

export function generatorByName(name: string): GeneratorSkill | undefined {
  return GENERATOR_SKILLS.find((g) => g.name === name);
}
