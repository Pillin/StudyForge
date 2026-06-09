import type { Context } from "hono";
import type { AppContext } from "../env.js";
import { db, schema, getLatestDocument } from "../db/queries.js";
import { OpenRouter, type ChatMessage } from "../agent/openrouter.js";
import { createSSE } from "../agent/sse.js";
import { runAgentTurn, RetryableToolError, type ToolHandler } from "../agent/loop.js";
import { toolDefsFor } from "../agent/tools.js";
import { generatorByTool, type GeneratorSkill } from "../agent/registry.js";
import { assembleSystemPrompt } from "../agent/prompt.js";
import { courseContext } from "../services/courses.js";
import { persistVersion, isComplete } from "../services/documents.js";

type CourseRow = typeof schema.courses.$inferSelect;

const TOOL_TYPE: Record<string, "course_requirements" | "main_plan"> = {
  emit_course_requirements: "course_requirements",
  emit_main_plan: "main_plan",
};

/** Set up SSE, run a bounded agent turn that may emit documents, stream events. */
export function runAgentStream(
  c: Context<AppContext>,
  opts: {
    course: CourseRow;
    phaseInstructions: string;
    generators: GeneratorSkill[];
    history: ChatMessage[];
    afterToolSuccess?: (toolName: string, documentId: string, status: string) => Promise<void>;
    onAssistantDone?: (assistantText: string) => Promise<void>;
  },
): Response {
  const database = db(c.env.DB);
  const client = new OpenRouter(c.env.OPENROUTER_API_KEY, c.env.OPENROUTER_MODEL);
  const system = assembleSystemPrompt(courseContext(opts.course), opts.phaseInstructions);
  const tools = toolDefsFor(opts.generators);
  const courseId = opts.course.id;

  const handle: ToolHandler = async (toolName, argsJson) => {
    const gen = generatorByTool(toolName);
    if (!gen) throw new RetryableToolError(`unknown tool ${toolName}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(argsJson);
    } catch {
      throw new RetryableToolError("arguments were not valid JSON");
    }
    const docType = TOOL_TYPE[toolName]!;
    if (docType === "main_plan") {
      const req = await getLatestDocument(database, courseId, "course_requirements");
      if (!isComplete(req)) {
        throw new RetryableToolError(
          "A complete course_requirements must exist before generating the main_plan.",
        );
      }
    }
    const doc = await persistVersion(database, {
      courseId,
      type: docType,
      origin: "agent",
      content: parsed,
      contentSchema: gen.schema,
    });
    if (opts.afterToolSuccess) await opts.afterToolSuccess(toolName, doc.id, doc.status);
    return {
      documentId: doc.id,
      version: doc.version,
      status: doc.status,
      ...(doc.review_flags ? { flags: doc.review_flags } : {}),
    };
  };

  const sse = createSSE();
  const run = async () => {
    try {
      const { assistantText } = await runAgentTurn({
        client,
        system,
        history: opts.history,
        tools,
        handle,
        sse,
      });
      if (opts.onAssistantDone) await opts.onAssistantDone(assistantText);
      await sse.send({ type: "done" });
    } catch (e) {
      await sse.send({
        type: "error",
        code: "GENERATION_FAILED",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      await sse.close();
    }
  };
  c.executionCtx.waitUntil(run());
  return sse.response;
}
