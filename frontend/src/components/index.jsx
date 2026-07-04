// ── Priority badge ────────────────────────────────────────────────────────────
const priorityConfig = {
  low:    { cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20", label: "Low" },
  medium: { cls: "bg-amber-500/15 text-amber-400 border border-amber-500/20",       label: "Medium" },
  high:   { cls: "bg-red-500/15 text-red-400 border border-red-500/20",             label: "High" },
};

export function PriorityBadge({ priority }) {
  const cfg = priorityConfig[priority] || priorityConfig.medium;
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Due date badge ─────────────────────────────────────────────────────────────
export function DueBadge({ dueDate }) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due - today) / 86400000);

  let cls = "text-slate-500";
  let label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays < 0) {
    cls = "text-red-400 font-semibold";
    label = `Overdue · ${label}`;
  } else if (diffDays === 0) {
    cls = "text-amber-400 font-semibold";
    label = `Due today`;
  } else if (diffDays <= 2) {
    cls = "text-amber-400";
  }

  return <span className={`text-xs ${cls}`}>{label}</span>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = "sm", color = "bg-violet-600" }) {
  const initial = name ? name[0].toUpperCase() : "?";
  const sz = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full text-white font-bold flex items-center justify-center shrink-0`} title={name}>
      {initial}
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
export function TaskCard({ task, onClick }) {
  const due = task.due_date ? new Date(task.due_date) : null;
  const today = new Date(); today.setHours(0,0,0,0);
  const isOverdue = due && due < today && task.status !== "done";
  const isDueToday = due && due.getTime() === today.getTime();

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`bg-slate-800 rounded-xl border p-3.5 cursor-pointer transition-all hover:border-slate-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
        isOverdue ? "border-red-500/40" : "border-slate-700"
      }`}
    >
      <p className="text-sm font-medium text-slate-100 mb-3 line-clamp-2 leading-snug">{task.title}</p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        <DueBadge dueDate={task.due_date} />
      </div>

      {task.assignee && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <Avatar name={task.assignee.display_name} size="sm" />
          <span className="text-xs text-slate-400">{task.assignee.display_name}</span>
        </div>
      )}
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────
const columnConfig = {
  todo:        { dot: "bg-slate-500", accent: "border-slate-700" },
  in_progress: { dot: "bg-amber-500", accent: "border-amber-500/30" },
  done:        { dot: "bg-emerald-500", accent: "border-emerald-500/30" },
};

export function KanbanColumn({ title, tasks, onTaskClick, statusKey }) {
  const cfg = columnConfig[statusKey] || columnConfig.todo;
  return (
    <div className={`flex-1 min-w-0 min-w-[240px] bg-slate-900 rounded-2xl border ${cfg.accent} flex flex-col`}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-slate-800">
        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <h3 className="font-semibold text-slate-200 text-sm flex-1">{title}</h3>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto scrollbar-hide">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-8">No tasks</p>
        )}
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center items-center h-32">
      <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, onClose }) {
  return (
    <div className="fixed bottom-5 right-5 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-2">
      <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-2 text-xs">✕</button>
    </div>
  );
}
