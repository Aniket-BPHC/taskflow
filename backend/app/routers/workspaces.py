from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, MemberRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceOut, WorkspaceDetail, MemberOut, InviteMember

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


def _require_membership(workspace_id: str, user_id: str, db: Session) -> WorkspaceMember:
    m = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return m


def _require_owner(workspace_id: str, user_id: str, db: Session) -> WorkspaceMember:
    m = _require_membership(workspace_id, user_id, db)
    if m.role != MemberRole.owner:
        raise HTTPException(status_code=403, detail="Only workspace owners can perform this action")
    return m


@router.get("/", response_model=list[WorkspaceOut])
def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()
    return [m.workspace for m in memberships]


@router.post("/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ws = Workspace(name=payload.name, owner_id=current_user.id)
    db.add(ws)
    db.flush()
    member = WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, role=MemberRole.owner)
    db.add(member)
    db.commit()
    db.refresh(ws)
    return ws


@router.get("/{workspace_id}", response_model=WorkspaceDetail)
def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_membership(workspace_id, current_user.id, db)
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.post("/{workspace_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def invite_member(workspace_id: str, payload: InviteMember, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_owner(workspace_id, current_user.id, db)
    target = db.query(User).filter(User.email == payload.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member")
    member = WorkspaceMember(workspace_id=workspace_id, user_id=target.id, role=MemberRole.member)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(workspace_id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_owner(workspace_id, current_user.id, db)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself from workspace")
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
