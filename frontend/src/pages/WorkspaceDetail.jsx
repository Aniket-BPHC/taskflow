import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi, projectsApi } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { Spinner } from "../components/index";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [newProject, setNewProject] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const { data: ws, isLoading } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspacesApi.get(id),
  });

  const { data: projects = [], isLoading: projLoading } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.list(id),
  });

  const createProject = useMutation({
    mutationFn: () => projectsApi.create(id, { name: newProject }),
    onSuccess: (proj) => {
      qc.invalidateQueries(["projects", id]);
      setNewProject("");
      navigate(`/projects/${proj.id}`);
    },
  });

  const inviteMember = useMutation({
    mutationFn: () => workspacesApi.invite(id, { email: inviteEmail }),
    onSuccess: () => {
      qc.invalidateQueries(["workspace", id]);
      setInviteEmail("");
      setInviteError("");
    },
    onError: (e) => setInviteError(e.response?.data?.detail || "Invite failed"),
  });

  if (isLoading) return <Spinner />;

  const isOwner = ws?.owner_id === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/workspaces" className="text-gray-400 hover:text-gray-600 text-sm">← Workspaces</Link>
        <h1 className="text-lg font-bold text-gray-900">{ws?.name}</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
        {/* Projects */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Projects</h2>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newProject.trim() && createProject.mutate()}
              placeholder="New project name…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => newProject.trim() && createProject.mutate()}
              disabled={createProject.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>

          {projLoading ? <Spinner /> : (
            <div className="space-y-2">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{proj.name}</p>
                    {proj.description && <p className="text-xs text-gray-400 mt-0.5">{proj.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${proj.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {proj.status}
                  </span>
                </button>
              ))}
              {projects.length === 0 && (
                <p className="text-center text-gray-400 py-8">No projects yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Members sidebar */}
        <div className="w-64 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Members</h2>
          <div className="space-y-2 mb-4">
            {ws?.members?.map((m) => (
              <div key={m.user.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center font-bold">
                  {m.user.display_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.user.display_name}</p>
                  <p className="text-xs text-gray-400">{m.role}</p>
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invite by email</p>
              {inviteError && <p className="text-red-500 text-xs mb-1">{inviteError}</p>}
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => inviteEmail.trim() && inviteMember.mutate()}
                  disabled={inviteMember.isPending}
                  className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
