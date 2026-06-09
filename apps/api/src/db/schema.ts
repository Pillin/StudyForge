import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  subject: text("subject").notNull(),
  audience: text("audience").notNull(),
  ageRange: text("age_range").notNull(),
  language: text("language").notNull(),
  roleTerm: text("role_term").notNull(),
  /** JSON: tone_preset, citation_style, inclusion_enabled, role_model_enabled, session_count, session_durations[] */
  config: text("config").notNull(),
  readyState: text("ready_state").notNull().default("draft"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const interviewSessions = sqliteTable("interview_sessions", {
  id: text("id").primaryKey(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  /** JSON array of { role, content } */
  transcript: text("transcript").notNull().default("[]"),
  /** JSON: { covered: string[], missing: string[] } */
  coverage: text("coverage").notNull().default('{"covered":[],"missing":[]}'),
  status: text("status").notNull().default("in_progress"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    type: text("type").notNull(), // course_requirements | main_plan
    version: integer("version").notNull(),
    status: text("status").notNull().default("draft"), // draft | needs_review | approved
    origin: text("origin").notNull().default("agent"), // agent | manual
    /** JSON content validated by the type's Zod schema before write. */
    content: text("content").notNull(),
    /** JSON array of failed criteria when status=needs_review. */
    reviewFlags: text("review_flags"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    versionUnique: unique().on(t.courseId, t.type, t.version),
    courseTypeIdx: index("documents_course_type_idx").on(t.courseId, t.type),
  }),
);
