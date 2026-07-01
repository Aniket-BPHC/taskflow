import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { Spinner } from "../components/index";

export default function WorkspaceList() {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuthStore();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600">TaskFlow</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.display_name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Workspaces</h2>
          <button
            onClick={() => setCreating(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            + New Workspace
          </button>
        </div>

        {creating && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && createMutation.mutate()}
              placeholder="Workspace name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => name.trim() && createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600 text-sm px-2">
              Cancel
            </button>
          </div>
        )}

        {isLoading ? <Spinner /> : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => navigate(`/workspaces/${ws.id}`)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">{ws.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Created {new Date(ws.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-gray-400 text-lg">→</span>
              </button>
            ))}
            {workspaces.length === 0 && !creating && (
              <p className="text-center text-gray-400 py-12">No workspaces yet. Create one to get started.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
