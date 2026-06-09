/**
 * Dev seed: create a user + a sample course against a locally running API.
 * Usage: start `pnpm --filter @studyforge/api dev`, then:
 *   node --experimental-strip-types apps/api/scripts/seed.ts
 * (or run with tsx). Targets http://localhost:8787 by default.
 */
const BASE = process.env.API_BASE ?? "http://localhost:8787";

async function main() {
  const email = `seed${Date.now()}@studyforge.dev`;
  const signup = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  const cookie = (signup.headers.get("set-cookie") ?? "").split(";")[0];
  console.log("user:", email);

  const course = await fetch(`${BASE}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      subject: "Introducción a la programación",
      audience: "estudiantes principiantes",
      age_range: "16-18",
      language: "es",
      session_count: 2,
      session_durations: [180, 180],
    }),
  });
  const json = (await course.json()) as { course: { id: string } };
  console.log("course:", json.course.id);
  console.log("Done. Open the web app and run the interview for this course.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
