import { createRootRoute, createRoute, createRouter, Outlet, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./lib/api.js";
import { Login, Signup } from "./routes/Login.js";
import { CoursesList } from "./routes/CoursesList.js";
import { NewCourse } from "./routes/NewCourse.js";
import { CourseDetail } from "./routes/CourseDetail.js";
import { Versions } from "./routes/Versions.js";

function RootLayout() {
  const qc = useQueryClient();
  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    await qc.invalidateQueries();
    window.location.href = "/login";
  }
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          StudyForge
        </Link>
        <button className="link" onClick={logout}>
          Sign out
        </button>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CoursesList,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Signup,
});
const newCourseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/new",
  component: NewCourse,
});
const courseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseId",
  component: CourseDetail,
});
const versionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses/$courseId/versions",
  component: Versions,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  newCourseRoute,
  courseDetailRoute,
  versionsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
