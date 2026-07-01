import json
import asyncio
from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        """Called once at startup to capture the running event loop."""
        self._loop = loop

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[project_id].add(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        self.rooms[project_id].discard(websocket)
        if not self.rooms[project_id]:
            del self.rooms[project_id]

    async def broadcast(self, project_id: str, payload: dict):
        message = json.dumps(payload)
        dead = set()
        for ws in list(self.rooms.get(project_id, set())):
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(project_id, ws)

    def broadcast_sync(self, project_id: str, payload: dict):
        """Thread-safe broadcast from sync route handlers."""
        if not self._loop or not self._loop.is_running():
            return
        asyncio.run_coroutine_threadsafe(
            self.broadcast(project_id, payload),
            self._loop,
        )

manager = ConnectionManager()
