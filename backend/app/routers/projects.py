from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workspace import WorkspaceMember, MemberRole
from app.models.project import Project, ProjectStatus
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/projects", tags=["projects"])


def _require_membership(workspace_id: str, user_id: str, db: Session) -> WorkspaceMember:
    m = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return m


@router.get("/", response_model=list[ProjectOut])
def list_projects(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_membership(workspace_id, current_user.id, db)
    return db.query(Project).filter(Project.workspace_id == workspace_id).all()


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(workspace_id: str, payload: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_membership(workspace_id, current_user.id, db)
    project = Project(workspace_id=workspace_id, created_by=current_user.id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(workspace_id: str, project_id: str, payload: ProjectUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_membership(workspace_id, current_user.id, db)
    project = db.query(Project).filter(Project.id == project_id, Project.workspace_id == workspace_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(workspace_id: str, project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = _require_membership(workspace_id, current_user.id, db)
    if membership.role != MemberRole.owner:
        raise HTTPException(status_code=403, detail="Only workspace owners can delete projects")
    project = db.query(Project).filter(Project.id == project_id, Project.workspace_id == workspace_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Soft delete
    project.status = ProjectStatus.archived
    db.commit()
