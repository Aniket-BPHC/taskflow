import { useEffect, useRef } from "react";
import { useAuthStore } from "./useAuthStore";

/**
 * Opens a WebSocket to /ws/{projectId}?token=<jwt>.
 * onMessage receives the parsed JSON event object.
 * Cleans up on unmount.
 */
export function useWebSocket(projectId, onMessage) {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!projectId || !token) return;

    // In dev, VITE_API_URL is unset and Vite's proxy makes same-origin work.
    // In production, frontend (Vercel) and backend (Railway) are on different
    // domains, so we must target the API host explicitly.
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const apiHost = new URL(apiUrl);
    const protocol = apiHost.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${apiHost.host}/ws/${projectId}?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (e) => console.error("WebSocket error", e);

    return () => {
      ws.close();
    };
  }, [projectId, token]);
}
