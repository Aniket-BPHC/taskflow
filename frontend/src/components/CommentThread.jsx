import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { Avatar } from "./index";

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

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-300 mb-4">
        Comments <span className="text-slate-600 font-normal">{comments.length}</span>
      </h3>

      <div className="space-y-4 mb-5">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar name={c.author?.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-300">{c.author?.display_name}</span>
                  <span className="text-xs text-slate-600">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
                {c.author_id === user?.id && (
                  <button
                    onClick={() => deleteMutation.mutate(c.id)}
                    className="text-xs text-slate-600 hover:text-red-400 mt-1 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment */}
      <div className="flex gap-3 items-start">
        <Avatar name={user?.display_name} size="sm" />
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && body.trim() && (e.preventDefault(), addMutation.mutate())}
            placeholder="Write a comment… (Enter to post)"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => body.trim() && addMutation.mutate()}
              disabled={addMutation.isPending || !body.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
