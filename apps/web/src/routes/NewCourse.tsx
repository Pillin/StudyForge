import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { CourseDTO } from "@studyforge/shared";
import { api, ApiError } from "../lib/api.js";

export function NewCourse() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    subject: "",
    audience: "",
    age_range: "",
    language: "es",
    session_count: 1,
    duration: 180,
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api<{ course: CourseDTO }>("/courses", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject,
          audience: form.audience,
          age_range: form.age_range,
          language: form.language,
          session_count: Number(form.session_count),
          session_durations: [Number(form.duration)],
        }),
      });
      await qc.invalidateQueries({ queryKey: ["courses"] });
      navigate({ to: "/courses/$courseId", params: { courseId: res.course.id } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create course");
    }
  }

  return (
    <div className="card">
      <h1>New course</h1>
      <form onSubmit={submit}>
        <label>
          Subject
          <input value={form.subject} onChange={(e) => set("subject", e.target.value)} required />
        </label>
        <label>
          Audience
          <input value={form.audience} onChange={(e) => set("audience", e.target.value)} required />
        </label>
        <label>
          Age range
          <input
            value={form.age_range}
            onChange={(e) => set("age_range", e.target.value)}
            required
          />
        </label>
        <label>
          Content language
          <input value={form.language} onChange={(e) => set("language", e.target.value)} required />
        </label>
        <label>
          Number of sessions
          <input
            type="number"
            min={1}
            value={form.session_count}
            onChange={(e) => set("session_count", Number(e.target.value))}
          />
        </label>
        <label>
          Session duration (min)
          <input
            type="number"
            min={1}
            value={form.duration}
            onChange={(e) => set("duration", Number(e.target.value))}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Create</button>
      </form>
    </div>
  );
}
