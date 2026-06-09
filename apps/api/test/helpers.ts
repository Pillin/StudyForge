import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import app from "../src/index.js";

export async function request(
  path: string,
  init?: RequestInit,
  cookie?: string,
): Promise<Response> {
  const ctx = createExecutionContext();
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  const res = await app.request("http://localhost" + path, { ...init, headers }, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export function cookieFrom(res: Response): string {
  const sc = res.headers.get("set-cookie") ?? "";
  return sc.split(";")[0] ?? "";
}

let counter = 0;
export async function signup(): Promise<{ cookie: string; email: string }> {
  const email = `user${counter++}@test.dev`;
  const res = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password: "password123" }),
  });
  return { cookie: cookieFrom(res), email };
}

export async function createCourse(cookie: string): Promise<string> {
  const res = await request(
    "/courses",
    {
      method: "POST",
      body: JSON.stringify({
        subject: "Intro to Programming",
        audience: "beginners",
        age_range: "16-18",
        language: "es",
        session_count: 1,
        session_durations: [180],
      }),
    },
    cookie,
  );
  const json = (await res.json()) as { course: { id: string } };
  return json.course.id;
}

export const validRequirements = {
  general_data: "1 sesión de 180 min, modalidad presencial.",
  source_material_note: "Ningún material fuente entregado.",
  available_technology: "Laptops con navegador; Kahoot.",
  pedagogical_criteria: "Español; 5E/Bloom/UDL; evaluación formativa.",
  constraints_decisions: "No se generan evaluaciones inicial/final aquí.",
  missing_info: [],
};

export const validMainPlan = {
  description: "Curso introductorio de programación.",
  narrative_thread: "¿Cómo le doy instrucciones precisas a un computador?",
  sessions: [
    {
      ordinal: 1,
      title: "Variables",
      central_content: "Variables y tipos.",
      session_type: "standard",
      objectives: [{ statement: "Declarar variables", bloom_level: "apply" }],
    },
  ],
  time_distribution: [
    {
      session_type: "standard",
      total_minutes: 180,
      blocks: [
        { name: "Apertura", activity: "hook", minutes: 30 },
        { name: "Cátedra", activity: "explain", minutes: 90 },
        { name: "Práctica", activity: "elaborate", minutes: 60 },
      ],
    },
  ],
  difficulty_progression: "De simple a compuesto.",
  accessibility_plan: "Instrucciones orales y escritas.",
  technology: "Navegador.",
  planned_files: ["00-overview.md"],
};
