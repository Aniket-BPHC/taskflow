from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.project import Project
from app.ws.manager import manager

router = APIRouter()


def _get_db() -> Session:
    return SessionLocal()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, token: str = ""):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

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
        user = db.query(User).filter(User.id == user_id).first()
        display_name = user.display_name if user else "Unknown"
    finally:
        db.close()

    await manager.connect(project_id, websocket)

    # Announce this user's arrival to everyone else on the board
    await manager.broadcast(project_id, {
        "event": "presence",
        "user_id": user_id,
        "display_name": display_name,
    })

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket)
        # Announce departure
        manager.broadcast_sync(project_id, {
            "event": "presence_left",
            "user_id": user_id,
        })
