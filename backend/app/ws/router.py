from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.task import Task
from app.models.workspace import WorkspaceMember
from app.models.project import Project
from app.ws.manager import manager

router = APIRouter()


def _get_db() -> Session:
    return SessionLocal()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, token: str = ""):
    # Validate token
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    # Verify user is a member of the workspace that owns this project
    db = _get_db()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            await websocket.close(code=4004)
            return
        membership = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == user_id,
        ).first()
        if not membership:
            await websocket.close(code=4003)
            return
    finally:
        db.close()

    await manager.connect(project_id, websocket)
    try:
        while True:
            # Clients don't send messages; just keep alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
