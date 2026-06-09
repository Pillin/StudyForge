import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CourseDTO, DocumentDTO } from "@studyforge/shared";
import { api, ApiError } from "../lib/api.js";
import { postSSE } from "../lib/sse.js";

interface CourseResp {
  course: CourseDTO;
  readiness: string;
}
interface InterviewResp {
  transcript: { role: string; content: string }[];
  coverage: { covered: string[]; missing: string[] };
  status: string;
}

function useDoc(courseId: string, type: string) {
  return useQuery({
    queryKey: ["doc", courseId, type],
    queryFn: async () => {
      try {
        return (await api<{ document: DocumentDTO }>(`/courses/${courseId}/documents/${type}`))
          .document;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

export function CourseDetail() {
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [stream, setStream] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => api<CourseResp>(`/courses/${courseId}`),
  });
  const interview = useQuery({
    queryKey: ["interview", courseId],
    queryFn: () => api<InterviewResp>(`/courses/${courseId}/interview`),
  });
  const requirements = useDoc(courseId, "course-requirements");
  const mainPlan = useDoc(courseId, "main-plan");

  function refresh() {
    qc.invalidateQueries({ queryKey: ["course", courseId] });
    qc.invalidateQueries({ queryKey: ["interview", courseId] });
    qc.invalidateQueries({ queryKey: ["doc", courseId] });
  }

  async function runStream(path: string, body: unknown) {
    setBusy(true);
    setStream("");
    setError(null);
    try {
      await postSSE(path, body, (e) => {
        if (e.type === "token") setStream((s) => s + (e.text as string));
        if (e.type === "error") setError(String(e.message));
      });
    } catch {
      setError("Stream failed");
    } finally {
      setBusy(false);
      setStream("");
      refresh();
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;
    const m = message;
    setMessage("");
    await runStream(`/courses/${courseId}/interview/messages`, { message: m });
  }

  async function approve() {
    setError(null);
    try {
      await api(`/courses/${courseId}/approve`, { method: "POST" });
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Approve failed");
    }
  }

  if (course.isLoading) return <p>Loading…</p>;
  if (course.isError) return <p className="error">Course not found.</p>;
  const readiness = course.data!.readiness;

  return (
    <div>
      <div className="row">
        <h1>{course.data!.course.subject}</h1>
        <span className={`badge ${readiness}`}>{readiness}</span>
        <Link to="/">← all courses</Link>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>1 · Requirements interview</h2>
        <p>
          Covered: {interview.data?.coverage.covered.join(", ") || "—"} · Missing:{" "}
          {interview.data?.coverage.missing.join(", ") || "none"} · Status: {interview.data?.status}
        </p>
        <div className="transcript">
          {interview.data?.transcript.map((t, i) => (
            <p key={i} className={t.role}>
              <strong>{t.role}:</strong> {t.content}
            </p>
          ))}
          {stream && <p className="assistant streaming">{stream}</p>}
        </div>
        <div className="row">
          <input
            value={message}
            placeholder="Answer the interviewer…"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={busy}
          />
          <button onClick={sendMessage} disabled={busy}>
            Send
          </button>
        </div>
      </section>

      <section className="card">
        <h2>2 · Course requirements</h2>
        {requirements.data ? (
          <DocBlock doc={requirements.data} />
        ) : (
          <p>Not produced yet — complete the interview.</p>
        )}
      </section>

      <section className="card">
        <h2>3 · Main plan</h2>
        <button
          onClick={() => runStream(`/courses/${courseId}/documents/main-plan/generate`, {})}
          disabled={busy || !requirements.data || requirements.data.status === "needs_review"}
        >
          Generate main plan
        </button>
        {mainPlan.data ? <DocBlock doc={mainPlan.data} /> : <p>Not produced yet.</p>}
      </section>

      <section className="card">
        <h2>4 · Approval</h2>
        <p>
          Approving both documents unlocks per-class generation. Editing a document afterwards
          revokes approval.
        </p>
        <button
          onClick={approve}
          disabled={
            !requirements.data ||
            !mainPlan.data ||
            requirements.data.status === "needs_review" ||
            mainPlan.data.status === "needs_review" ||
            readiness === "ready"
          }
        >
          {readiness === "ready" ? "Approved ✓" : "Approve requirements + main plan"}
        </button>
        <p>
          <Link to="/courses/$courseId/versions" params={{ courseId }}>
            View version history →
          </Link>
        </p>
      </section>
    </div>
  );
}

function DocBlock({ doc }: { doc: DocumentDTO }) {
  return (
    <div>
      <p>
        <span className={`badge ${doc.status}`}>{doc.status}</span> v{doc.version} ({doc.origin})
      </p>
      {doc.review_flags && (
        <ul className="error">
          {doc.review_flags.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      <pre className="doc">{JSON.stringify(doc.content, null, 2)}</pre>
    </div>
  );
}
