import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CourseDTO } from "@studyforge/shared";
import { api } from "../lib/api.js";
import { useMe } from "../lib/auth.js";

export function CoursesList() {
  const me = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (me.isError) navigate({ to: "/login" });
  }, [me.isError, navigate]);

  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<{ courses: CourseDTO[] }>("/courses"),
    enabled: me.isSuccess,
  });

  if (!me.isSuccess) return <p>Loading…</p>;

  return (
    <div>
      <div className="row">
        <h1>Your courses</h1>
        <Link to="/courses/new" className="button">
          + New course
        </Link>
      </div>
      {courses.data?.courses.length === 0 && <p>No courses yet. Create your first one.</p>}
      <ul className="list">
        {courses.data?.courses.map((c) => (
          <li key={c.id}>
            <Link to="/courses/$courseId" params={{ courseId: c.id }}>
              <strong>{c.subject}</strong>
            </Link>
            <span className={`badge ${c.ready_state}`}>{c.ready_state}</span>
            <small>
              {c.audience} · {c.language}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}
