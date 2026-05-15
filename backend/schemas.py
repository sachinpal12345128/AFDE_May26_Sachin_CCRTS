"""
Pydantic schemas — request/response shapes for the CCRTS API.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = Field(None, max_length=20)
    # Customers self-register; staff must be created by an admin
    role_name: str = Field(default="Customer")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- Users ----------
class UserOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role_id: int
    role_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    phone: Optional[str] = Field(None, max_length=20)
    role_name: str  # Admin / Supervisor / Agent / Customer


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    role_name: Optional[str] = None


# ---------- Roles ----------
class RoleOut(BaseModel):
    role_id: int
    role_name: str
    model_config = ConfigDict(from_attributes=True)


# ---------- Categories ----------
class CategoryOut(BaseModel):
    category_id: int
    category_name: str
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)


# ---------- Complaints ----------
class ComplaintCreate(BaseModel):
    category_id: int
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    priority: str = Field(default="Medium")


class ComplaintAssign(BaseModel):
    agent_id: int


class ComplaintStatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None
    resolution_notes: Optional[str] = None


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None


class FeedbackOut(BaseModel):
    feedback_id: int
    complaint_id: int
    rating: int
    comments: Optional[str] = None
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ComplaintHistoryOut(BaseModel):
    history_id: int
    old_status: Optional[str]
    new_status: str
    comment: Optional[str]
    updated_at: datetime
    updated_by: int
    updated_by_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ComplaintOut(BaseModel):
    complaint_id: int
    customer_id: int
    customer_name: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    subject: str
    description: str
    priority: str
    status: str
    assigned_to: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    sla_breached: bool = False
    history: List[ComplaintHistoryOut] = []
    feedback: Optional[FeedbackOut] = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_complaints: int
    open_complaints: int
    in_progress: int
    resolved: int
    closed: int
    escalated: int
    sla_breached: int
    avg_resolution_hours: Optional[float] = None
    total_customers: int
    total_agents: int


# Forward refs
TokenResponse.model_rebuild()
