import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";

export function CommentThread({ taskId }) {
  const [body, setBody] = useState("");
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => commentsApi.list(taskId),
  });

  const addMutation = useMutation({
    mutationFn: () => commentsApi.add(taskId, { body }),
    onSuccess: () => {
      qc.invalidateQueries(["comments", taskId]);
      setBody("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => commentsApi.delete(taskId, commentId),
    onSuccess: () => qc.invalidateQueries(["comments", taskId]),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading comments…</p>;

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-gray-700 mb-2">Comments</h4>
      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="bg-gray-50 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-indigo-700">{c.author?.display_name}</span>
              <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-800">{c.body}</p>
            {c.author_id === user?.id && (
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Delete
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && body.trim() && addMutation.mutate()}
          placeholder="Add a comment…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => body.trim() && addMutation.mutate()}
          disabled={addMutation.isPending}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
