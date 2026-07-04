import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi, projectsApi } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { AppShell, } from "../components/Layout";
import { Spinner } from "../components/index";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [newProject, setNewProject] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

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
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    },
    onError: (e) => setInviteError(e.response?.data?.detail || "Invite failed"),
  });

  if (isLoading) return <AppShell><Spinner /></AppShell>;

  const isOwner = ws?.owner_id === user?.id;
  const doneCount = projects.filter(p => p.status === "active").length;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/workspaces" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Workspaces</Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-bold text-white">{ws?.name}</h1>
        </div>

        <div className="flex gap-8">
          {/* Projects */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Projects <span className="text-slate-500 font-normal text-sm ml-1">{projects.length}</span></h2>
            </div>

            {/* Create project input */}
            <div className="flex gap-2 mb-5">
              <input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newProject.trim() && createProject.mutate()}
                placeholder="New project name…"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
              <button
                onClick={() => newProject.trim() && createProject.mutate()}
                disabled={createProject.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>

            {projLoading ? <Spinner /> : (
              <div className="space-y-2">
                {projects.map((proj) => {
                  return (
                    <button
                      key={proj.id}
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      className="w-full bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 text-left transition-all flex items-center gap-4 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
                        <ProjectIcon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{proj.name}</p>
                        {proj.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{proj.description}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proj.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        {proj.status}
                      </span>
                    </button>
                  );
                })}
                {projects.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-3xl mb-3">🗂</p>
                    <p className="text-sm">No projects yet — create one above</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 shrink-0 space-y-6">
            {/* Members */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Members <span className="text-slate-600 font-normal">{ws?.members?.length}</span></h3>
              <div className="space-y-3">
                {ws?.members?.map((m) => (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {m.user.display_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{m.user.display_name}</p>
                      <p className="text-xs text-slate-500">{m.role}</p>
                    </div>
                    {m.user.id === ws?.owner_id && (
                      <span className="text-xs text-amber-500 font-medium">owner</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite */}
            {isOwner && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Invite member</h3>
                {inviteError && <p className="text-red-400 text-xs mb-2">{inviteError}</p>}
                {inviteSuccess && <p className="text-emerald-400 text-xs mb-2">Invite sent!</p>}
                <div className="space-y-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && inviteEmail.trim() && inviteMember.mutate()}
                    placeholder="user@example.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  />
                  <button
                    onClick={() => inviteEmail.trim() && inviteMember.mutate()}
                    disabled={inviteMember.isPending}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {inviteMember.isPending ? "Inviting…" : "Send Invite"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ProjectIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
