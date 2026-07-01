// ── Priority badge ────────────────────────────────────────────────────────────
const priorityColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColors[priority] || ""}`}>
      {priority}
    </span>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
export function TaskCard({ task, onClick }) {
  return (
    <div
      onClick={() => onClick?.(task)}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <p className="font-medium text-sm text-gray-800 mb-2 line-clamp-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className="text-xs text-gray-500">{task.due_date}</span>
        )}
      </div>
      {task.assignee && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">
            {task.assignee.display_name[0].toUpperCase()}
          </div>
          <span className="text-xs text-gray-500">{task.assignee.display_name}</span>
        </div>
      )}
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────
export function KanbanColumn({ title, tasks, onTaskClick }) {
  return (
    <div className="flex-1 min-w-0 bg-gray-100 rounded-xl p-3">
      <h3 className="font-semibold text-gray-700 mb-3 px-1">
        {title}
        <span className="ml-2 text-xs text-gray-400 font-normal">{tasks.length}</span>
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center items-center h-32">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50">
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="text-indigo-200 hover:text-white text-xs">✕</button>
    </div>
  );
}
