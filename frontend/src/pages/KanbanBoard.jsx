import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuthStore } from "../hooks/useAuthStore";
import { AppShell } from "../components/Layout";
import { KanbanColumn, Spinner, Toast, Avatar } from "../components/index";

const COLUMNS = [
  { key: "todo",        label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done",        label: "Done" },
];

export default function KanbanBoard() {
  const { id: projectId } = useParams();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterMine, setFilterMine] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium", status: "todo" });

  // Live presence: track who else is on this board
  const [presence, setPresence] = useState({});

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => tasksApi.create(projectId, newTask),
    onSuccess: (created) => {
      qc.setQueryData(["tasks", projectId], (old = []) => {
        if (old.find((t) => t.id === created.id)) return old;
        return [...old, created];
      });
      setNewTask({ title: "", priority: "medium", status: "todo" });
      setShowCreate(false);
    },
  });

  const handleWsEvent = useCallback((event) => {
    if (event.event === "task.created") {
      qc.setQueryData(["tasks", projectId], (old = []) => {
        if (old.find((t) => t.id === event.task.id)) return old;
        return [...old, event.task];
      });
      if (event.task.created_by !== user?.id) setToast(`New task: "${event.task.title}"`);
    } else if (event.event === "task.updated") {
      qc.setQueryData(["tasks", projectId], (old = []) =>
        old.map((t) => t.id === event.task_id ? { ...t, ...event.changes } : t)
      );
    } else if (event.event === "task.deleted") {
      qc.setQueryData(["tasks", projectId], (old = []) =>
        old.filter((t) => t.id !== event.task_id)
      );
    } else if (event.event === "comment.added") {
      qc.setQueryData(["comments", event.comment.task_id], (old) => {
        if (!old) return old;
        if (old.find((c) => c.id === event.comment.id)) return old;
        return [...old, event.comment];
      });
      if (event.comment.author_id !== user?.id) setToast("New comment on a task");
    } else if (event.event === "presence_left") {
      setPresence((prev) => { const next = { ...prev }; delete next[event.user_id]; return next; });
    } else if (event.event === "presence") {
      setPresence((prev) => ({ ...prev, [event.user_id]: event.display_name }));
    }
  }, [projectId, user, qc]);

  useWebSocket(projectId, handleWsEvent);

  const visibleTasks = filterMine
    ? tasks.filter((t) => t.assignee_id === user?.id || t.created_by === user?.id)
    : tasks;

  const tasksByStatus = (status) => visibleTasks.filter((t) => t.status === status);

  const overdueCount = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    return new Date(t.due_date) < new Date();
  }).length;

  const otherUsers = Object.entries(presence).filter(([id]) => id !== user?.id);

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link to="/workspaces" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Workspaces</Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-sm font-semibold text-slate-200">Project Board</h1>
            {overdueCount > 0 && (
              <span className="bg-red-500/15 text-red-400 border border-red-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
                {overdueCount} overdue
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Live presence avatars */}
            {otherUsers.length > 0 && (
              <div className="flex items-center gap-1 mr-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {otherUsers.slice(0, 3).map(([id, name]) => (
                  <Avatar key={id} name={name} size="sm" color="bg-slate-600" />
                ))}
                <span className="text-xs text-slate-500 ml-1">online</span>
              </div>
            )}

            <button
              onClick={() => setFilterMine(!filterMine)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterMine
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              My tasks
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Create task form */}
        {showCreate && (
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
            <div className="max-w-xl flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <input
                  autoFocus
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && newTask.title.trim() && createMutation.mutate()}
                  placeholder="Task title…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <input
                    type="date"
                    value={newTask.due_date || ""}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value || undefined })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => newTask.title.trim() && createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 h-10 transition-colors"
              >
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300 text-sm h-10 px-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? <Spinner /> : (
            <div className="flex gap-4 h-full min-h-0">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.key}
                  statusKey={col.key}
                  title={col.label}
                  tasks={tasksByStatus(col.key)}
                  onTaskClick={(task) => navigate(`/projects/${projectId}/tasks/${task.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
