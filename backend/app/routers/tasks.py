from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.project import Project
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut
from app.ws.manager import manager

router = APIRouter(prefix="/api/v1/projects/{project_id}/tasks", tags=["tasks"])


def _get_project_and_check_membership(project_id: str, user_id: str, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == project.workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return project


@router.get("/", response_model=list[TaskOut])
def list_tasks(
    project_id: str,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    assignee_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_project_and_check_membership(project_id, current_user.id, db)
    q = db.query(Task).filter(Task.project_id == project_id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if assignee_id:
        q = q.filter(Task.assignee_id == assignee_id)
    return q.all()


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(project_id: str, payload: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_project_and_check_membership(project_id, current_user.id, db)
    task = Task(project_id=project_id, created_by=current_user.id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    task_data = TaskOut.model_validate(task).model_dump(mode="json")
    manager.broadcast_sync(project_id, {"event": "task.created", "task": task_data})
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(project_id: str, task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_project_and_check_membership(project_id, current_user.id, db)
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(project_id: str, task_id: str, payload: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_project_and_check_membership(project_id, current_user.id, db)
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    changes = payload.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(task, field, value)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    manager.broadcast_sync(project_id, {"event": "task.updated", "task_id": task_id, "changes": payload.model_dump(mode="json", exclude_none=True)})
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(project_id: str, task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_project_and_check_membership(project_id, current_user.id, db)
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    manager.broadcast_sync(project_id, {"event": "task.deleted", "task_id": task_id})
