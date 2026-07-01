import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "./hooks/useAuthStore";
import { authApi } from "./api/client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WorkspaceList from "./pages/WorkspaceList";
import WorkspaceDetail from "./pages/WorkspaceDetail";
import KanbanBoard from "./pages/KanbanBoard";
import TaskDetail from "./pages/TaskDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Re-fetches /auth/me on every page load so user is never null after refresh
function AuthHydrator({ children }) {
  const { token, setAuth, logout } = useAuthStore();

  const { data: user, error } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (user) setAuth(user, token);
  }, [user]);

  useEffect(() => {
    if (error) logout();
  }, [error]);

  return children;
}

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/workspaces" replace /> : children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthHydrator>
          <Routes>
            <Route path="/" element={<Navigate to="/workspaces" replace />} />
            <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
            <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />

            <Route path="/workspaces" element={<RequireAuth><WorkspaceList /></RequireAuth>} />
            <Route path="/workspaces/:id" element={<RequireAuth><WorkspaceDetail /></RequireAuth>} />
            <Route path="/projects/:id" element={<RequireAuth><KanbanBoard /></RequireAuth>} />
            <Route path="/projects/:id/tasks/:taskId" element={<RequireAuth><TaskDetail /></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthHydrator>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
