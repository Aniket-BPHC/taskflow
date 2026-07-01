import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuthStore } from "../hooks/useAuthStore";
import { KanbanColumn, Spinner, Toast } from "../components/index";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function KanbanBoard() {
  const { id: projectId } = useParams();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium", status: "todo" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const createMutation = useMutation({
    mutationFn: () => tasksApi.create(projectId, newTask),
    onSuccess: (created) => {
      // Patch cache directly — avoids race with WS broadcast
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
    }
  }, [projectId, user, qc]);

  useWebSocket(projectId, handleWsEvent);

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/workspaces" className="text-gray-400 hover:text-gray-600 text-sm">← Workspaces</Link>
          <h1 className="text-lg font-bold text-gray-900">Project Board</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
        >
          + Add Task
        </button>
      </header>

      {showCreate && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-xl flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <input
                autoFocus
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && newTask.title.trim() && createMutation.mutate()}
                placeholder="Task title…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => newTask.title.trim() && createMutation.mutate()}
              disabled={createMutation.isPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 h-10"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-sm h-10 px-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 p-6">
        {isLoading ? <Spinner /> : (
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                title={col.label}
                tasks={tasksByStatus(col.key)}
                onTaskClick={(task) => navigate(`/projects/${projectId}/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
