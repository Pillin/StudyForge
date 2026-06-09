import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

interface VersionMeta {
  id: string;
  version: number;
  status: string;
  origin: string;
  created_at: number;
}

function VersionList({ courseId, type }: { courseId: string; type: string }) {
  const q = useQuery({
    queryKey: ["versions", courseId, type],
    queryFn: () =>
      api<{ versions: VersionMeta[] }>(`/courses/${courseId}/documents/${type}/versions`),
  });
  return (
    <div className="card">
      <h2>{type}</h2>
      {q.data?.versions.length === 0 && <p>No versions yet.</p>}
      <ul className="list">
        {q.data?.versions.map((v) => (
          <li key={v.id}>
            v{v.version} <span className={`badge ${v.status}`}>{v.status}</span>
            <small>
              {v.origin} · {new Date(v.created_at).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Versions() {
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  return (
    <div>
      <div className="row">
        <h1>Version history</h1>
        <Link to="/courses/$courseId" params={{ courseId }}>
          ← back to course
        </Link>
      </div>
      <VersionList courseId={courseId} type="course-requirements" />
      <VersionList courseId={courseId} type="main-plan" />
    </div>
  );
}
