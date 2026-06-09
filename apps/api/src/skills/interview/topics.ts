/** The required-topic set the interview MUST cover (FR-010). */
export const REQUIRED_TOPICS = [
  "course_identity",
  "time_and_schedule",
  "learning_context",
  "content",
  "technology",
  "special_sessions",
] as const;

export type RequiredTopic = (typeof REQUIRED_TOPICS)[number];

export interface Coverage {
  covered: string[];
  missing: string[];
}

export function initialCoverage(): Coverage {
  return { covered: [], missing: [...REQUIRED_TOPICS] };
}

export function isComplete(coverage: Coverage): boolean {
  return REQUIRED_TOPICS.every((t) => coverage.covered.includes(t));
}
