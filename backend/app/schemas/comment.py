from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.user import UserOut


class CommentCreate(BaseModel):
    body: str


class CommentUpdate(BaseModel):
    body: str


class CommentOut(BaseModel):
    id: str
    task_id: str
    author_id: str
    author: Optional[UserOut]
    body: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
