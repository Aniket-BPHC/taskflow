import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/client";
import { CommentThread } from "../components/CommentThread";
import { PriorityBadge, Spinner } from "../components/index";

export default function TaskDetail() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.get(projectId, taskId),
  });

  useEffect(() => {
    if (task && !form) {
      setForm({ title: task.title, description: task.description || "", status: task.status, priority: task.priority });
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (data) => tasksApi.update(projectId, taskId, data),
    onSuccess: () => {
      qc.invalidateQueries(["task", taskId]);
      qc.invalidateQueries(["tasks", projectId]);
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(projectId, taskId),
    onSuccess: () => navigate(`/projects/${projectId}`),
  });

  if (isLoading) return <Spinner />;
  if (!task) return <p className="p-8 text-gray-500">Task not found.</p>;

  const editForm = form || { title: task.title, description: task.description || "", status: task.status, priority: task.priority };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-600 text-sm">← Board</Link>
        <h1 className="text-lg font-bold text-gray-900 truncate">{task.title}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {editing ? (
            <div className="space-y-4">
              <input
                value={editForm.title}
                onChange={(e) => setForm({ ...editForm, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => setForm({ ...editForm, description: e.target.value })}
                rows={4}
                placeholder="Description…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-3">
                <select
                  value={editForm.status}
                  onChange={(e) => setForm({ ...editForm, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={editForm.priority}
                  onChange={(e) => setForm({ ...editForm, priority: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={updateMutation.isPending}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="text-gray-500 text-sm px-4 py-2">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setForm({ title: task.title, description: task.description || "", status: task.status, priority: task.priority }); setEditing(true); }}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => window.confirm("Delete this task?") && deleteMutation.mutate()}
                    className="text-sm text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <PriorityBadge priority={task.priority} />
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{task.status.replace("_", " ")}</span>
              </div>

              {task.description && <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{task.description}</p>}

              <div className="text-xs text-gray-400 space-y-1">
                {task.assignee && <p>Assigned to: <span className="text-gray-600">{task.assignee.display_name}</span></p>}
                {task.due_date && <p>Due: <span className="text-gray-600">{task.due_date}</span></p>}
                <p>Created: {new Date(task.created_at).toLocaleDateString()}</p>
              </div>
            </>
          )}

          <hr className="my-6 border-gray-100" />
          <CommentThread taskId={taskId} />
        </div>
      </main>
    </div>
  );
}
