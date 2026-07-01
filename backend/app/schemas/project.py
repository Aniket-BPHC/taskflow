from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectOut(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
