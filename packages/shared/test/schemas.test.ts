import { describe, it, expect } from "vitest";
import {
  CourseRequirementsContent,
  MainPlanContent,
  CourseConfig,
  toToolParameters,
} from "../src/index.js";

describe("CourseConfig", () => {
  it("applies configurable defaults (Principle IX)", () => {
    const c = CourseConfig.parse({
      subject: "Intro to Programming",
      audience: "beginners",
      age_range: "16-18",
      language: "es",
      session_count: 2,
      session_durations: [180, 180],
    });
    expect(c.role_term).toBe("teacher");
    expect(c.inclusion_enabled).toBe(false);
    expect(c.role_model_enabled).toBe(false);
  });
});

describe("CourseRequirementsContent", () => {
  it("requires a missing_info array", () => {
    const bad = CourseRequirementsContent.safeParse({
      general_data: "x",
      source_material_note: "x",
      available_technology: "x",
      pedagogical_criteria: "x",
      constraints_decisions: "x",
    });
    expect(bad.success).toBe(false);
  });
});

describe("MainPlanContent time-distribution sum rule (FR-015)", () => {
  const base = {
    description: "d",
    narrative_thread: "n",
    sessions: [
      {
        ordinal: 1,
        title: "S1",
        central_content: "c",
        session_type: "standard",
        objectives: [{ statement: "Implement a loop", bloom_level: "apply" }],
      },
    ],
    difficulty_progression: "p",
    accessibility_plan: "a",
    technology: "t",
    planned_files: ["00-overview.md"],
  };

  it("accepts blocks that sum to total_minutes", () => {
    const ok = MainPlanContent.safeParse({
      ...base,
      time_distribution: [
        {
          session_type: "standard",
          total_minutes: 60,
          blocks: [
            { name: "Apertura", activity: "hook", minutes: 10 },
            { name: "Cátedra", activity: "explain", minutes: 50 },
          ],
        },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects blocks that do not sum to total_minutes", () => {
    const bad = MainPlanContent.safeParse({
      ...base,
      time_distribution: [
        {
          session_type: "standard",
          total_minutes: 60,
          blocks: [{ name: "Apertura", activity: "hook", minutes: 10 }],
        },
      ],
    });
    expect(bad.success).toBe(false);
  });
});

describe("toToolParameters", () => {
  it("produces an object json-schema for a tool", () => {
    const params = toToolParameters(CourseRequirementsContent, "CourseRequirementsContent");
    expect(params["type"]).toBe("object");
    expect(params).toHaveProperty("properties");
  });
});
