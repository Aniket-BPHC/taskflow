import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../api/client";
import { AppShell } from "../components/Layout";
import { Spinner } from "../components/index";

export default function WorkspaceList() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () => workspacesApi.create({ name }),
    onSuccess: (ws) => {
      qc.invalidateQueries(["workspaces"]);
      setName("");
      setCreating(false);
      navigate(`/workspaces/${ws.id}`);
    },
  });

  const colors = ["bg-violet-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600"];
  const getColor = (id) => colors[id.charCodeAt(0) % colors.length];

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Workspaces</h1>
            <p className="text-slate-400 text-sm mt-1">Select a workspace or create a new one</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span> New Workspace
          </button>
        </div>

        {creating && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && createMutation.mutate()}
              placeholder="Workspace name…"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={() => name.trim() && createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button onClick={() => setCreating(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">
              Cancel
            </button>
          </div>
        )}

        {isLoading ? <Spinner /> : (
          <div className="grid gap-3">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => navigate(`/workspaces/${ws.id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 text-left transition-all flex items-center gap-4 group"
              >
                <div className={`w-10 h-10 rounded-lg ${getColor(ws.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {ws.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{ws.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Created {new Date(ws.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
              </button>
            ))}
            {workspaces.length === 0 && !creating && (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-4">📋</p>
                <p className="font-medium text-slate-400">No workspaces yet</p>
                <p className="text-sm mt-1">Create one to get started</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
