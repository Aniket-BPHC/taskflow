from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.workspace import WorkspaceMember, MemberRole
from app.models.task import Task
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate, CommentOut
from app.ws.manager import manager

router = APIRouter(prefix="/api/v1/tasks/{task_id}/comments", tags=["comments"])


def _get_task_and_check_membership(task_id: str, user_id: str, db: Session):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == task.project.workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return task, membership


@router.get("/", response_model=list[CommentOut])
def list_comments(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_task_and_check_membership(task_id, current_user.id, db)
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at.asc()).all()


@router.post("/", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(task_id: str, payload: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task, _ = _get_task_and_check_membership(task_id, current_user.id, db)
    comment = Comment(task_id=task_id, author_id=current_user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    comment_data = CommentOut.model_validate(comment).model_dump(mode="json")
    manager.broadcast_sync(task.project_id, {"event": "comment.added", "comment": comment_data})
    return comment


@router.patch("/{comment_id}", response_model=CommentOut)
def edit_comment(task_id: str, comment_id: str, payload: CommentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_task_and_check_membership(task_id, current_user.id, db)
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.task_id == task_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can edit this comment")
    comment.body = payload.body
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(task_id: str, comment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task, membership = _get_task_and_check_membership(task_id, current_user.id, db)
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.task_id == task_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != current_user.id and membership.role != MemberRole.owner:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    db.delete(comment)
    db.commit()
