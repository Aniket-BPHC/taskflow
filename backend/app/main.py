import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, workspaces, projects, tasks, comments
from app.ws.router import router as ws_router
from app.ws.manager import manager

settings = get_settings()

app = FastAPI(
    title="TaskFlow API",
    description="Real-Time Collaborative Task Manager",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(comments.router)
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    # Capture the running event loop so sync route handlers can
    # schedule WS broadcasts via run_coroutine_threadsafe
    manager.set_loop(asyncio.get_running_loop())


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "taskflow-api"}
