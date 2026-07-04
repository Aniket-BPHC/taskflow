import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/client";
import { CommentThread } from "../components/CommentThread";
import { PriorityBadge, DueBadge, Spinner, Avatar } from "../components/index";
import { AppShell } from "../components/Layout";

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
      setForm({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || "",
      });
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

  if (isLoading) return <AppShell><Spinner /></AppShell>;
  if (!task) return <AppShell><p className="p-8 text-slate-500">Task not found.</p></AppShell>;

  const editForm = form || { title: task.title, description: task.description || "", status: task.status, priority: task.priority, due_date: task.due_date || "" };

  const statusColors = {
    todo: "bg-slate-500/15 text-slate-400",
    in_progress: "bg-amber-500/15 text-amber-400",
    done: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/workspaces" className="text-slate-500 hover:text-slate-300 transition-colors">Workspaces</Link>
          <span className="text-slate-700">/</span>
          <Link to={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 transition-colors">Board</Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 truncate">{task.title}</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {/* Task header */}
          <div className="p-6 border-b border-slate-800">
            {editing ? (
              <div className="space-y-4">
                <input
                  value={editForm.title}
                  onChange={(e) => setForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  placeholder="Add a description…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
                />
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={editForm.status}
                    onChange={(e) => setForm({ ...editForm, status: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setForm({ ...editForm, priority: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setForm({ ...editForm, due_date: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ ...editForm, due_date: editForm.due_date || null })}
                    disabled={updateMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    Save changes
                  </button>
                  <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-xl font-bold text-white leading-snug">{task.title}</h1>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setForm({ title: task.title, description: task.description || "", status: task.status, priority: task.priority, due_date: task.due_date || "" });
                        setEditing(true);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => window.confirm("Delete this task?") && deleteMutation.mutate()}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${statusColors[task.status]}`}>
                    {task.status.replace("_", " ")}
                  </span>
                  <PriorityBadge priority={task.priority} />
                  <DueBadge dueDate={task.due_date} />
                </div>

                {task.description ? (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">{task.description}</p>
                ) : (
                  <p className="text-sm text-slate-600 italic mb-4">No description</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {task.assignee && (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.assignee.display_name} size="sm" />
                      <span>{task.assignee.display_name}</span>
                    </div>
                  )}
                  <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Comments */}
          <div className="p-6">
            <CommentThread taskId={taskId} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
