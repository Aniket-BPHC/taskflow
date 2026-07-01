from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.workspace import MemberRole
from app.schemas.user import UserOut


class WorkspaceCreate(BaseModel):
    name: str


class MemberOut(BaseModel):
    user: UserOut
    role: MemberRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceOut(BaseModel):
    id: str
    name: str
    owner_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceDetail(WorkspaceOut):
    members: list[MemberOut] = []


class InviteMember(BaseModel):
    email: EmailStr
