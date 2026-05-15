"""
Complaint lifecycle — create, list with filters, view, assign, status update.

Authorization rules:
  - Any authenticated user can list complaints, but Customers only see
    their own. Staff (Admin/Supervisor/Agent) see everything.
  - Only Customers can file new complaints.
  - Only Supervisor/Admin can assign to an agent.
  - Agents can update status on complaints assigned to them; Supervisor/
    Admin can update any.
  - Customers can mark a complaint as "Closed" (confirming the resolution)
    on complaints they own.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_roles, require_supervisor_or_admin
from database import get_db

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _is_staff(user: models.User) -> bool:
    return user.role.role_name in ("Admin", "Supervisor", "Agent")


def _sla_for(c: models.Complaint) -> int:
    return models.PRIORITY_SLA_HOURS.get(c.priority, 48)


def _sla_breached(c: models.Complaint) -> bool:
    if c.status == "Closed":
        return False
    end = c.resolved_at or datetime.utcnow()
    elapsed_h = (end - c.created_at).total_seconds() / 3600
    return elapsed_h > _sla_for(c)


def _serialize(c: models.Complaint) -> dict:
    return {
        "complaint_id": c.complaint_id,
        "customer_id": c.customer_id,
        "customer_name": c.customer.name if c.customer else None,
        "category_id": c.category_id,
        "category_name": c.category.category_name if c.category else None,
        "subject": c.subject,
        "description": c.description,
        "priority": c.priority,
        "status": c.status,
        "assigned_to": c.assigned_to,
        "assigned_agent_name": c.assigned_agent.name if c.assigned_agent else None,
        "resolution_notes": c.resolution_notes,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "resolved_at": c.resolved_at,
        "closed_at": c.closed_at,
        "sla_hours": _sla_for(c),
        "sla_breached": _sla_breached(c),
        "history": [
            {
                "history_id": h.history_id,
                "old_status": h.old_status,
                "new_status": h.new_status,
                "comment": h.comment,
                "updated_at": h.updated_at,
                "updated_by": h.updated_by,
                "updated_by_name": h.updater.name if h.updater else None,
            }
            for h in (c.history or [])
        ],
        "feedback": (
            None
            if not c.feedback
            else {
                "feedback_id": c.feedback.feedback_id,
                "complaint_id": c.feedback.complaint_id,
                "rating": c.feedback.rating,
                "comments": c.feedback.comments,
                "submitted_at": c.feedback.submitted_at,
            }
        ),
    }


@router.get("", response_model=List[schemas.ComplaintOut])
def list_complaints(
    status_: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    kwargs = dict(
        status=status_,
        priority=priority,
        category_id=category_id,
        search=search,
    )
    if user.role.role_name == "Customer":
        kwargs["customer_id"] = user.user_id
    elif user.role.role_name == "Agent":
        kwargs["assigned_to"] = user.user_id
    items = crud.list_complaints(db, **kwargs)
    return [_serialize(c) for c in items]


@router.get("/{complaint_id}", response_model=schemas.ComplaintOut)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    c = crud.get_complaint(db, complaint_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if user.role.role_name == "Customer" and c.customer_id != user.user_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Not your complaint"
        )
    return _serialize(c)


@router.post(
    "", response_model=schemas.ComplaintOut, status_code=status.HTTP_201_CREATED
)
def create_complaint(
    payload: schemas.ComplaintCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("Customer")),
):
    if payload.priority not in models.PRIORITY_SLA_HOURS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Priority must be one of {list(models.PRIORITY_SLA_HOURS)}",
        )
    category = crud.get_category(db, payload.category_id)
    if not category:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unknown category")
    c = crud.create_complaint(
        db,
        customer=user,
        category=category,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority,
    )
    # Refetch with eager loads for clean serialization
    return _serialize(crud.get_complaint(db, c.complaint_id))


@router.post("/{complaint_id}/assign", response_model=schemas.ComplaintOut)
def assign(
    complaint_id: int,
    payload: schemas.ComplaintAssign,
    db: Session = Depends(get_db),
    actor: models.User = Depends(require_supervisor_or_admin()),
):
    c = crud.get_complaint(db, complaint_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    agent = crud.get_user(db, payload.agent_id)
    if not agent or agent.role.role_name != "Agent":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Target user must be an Agent"
        )
    crud.assign_complaint(db, c, agent, actor)
    return _serialize(crud.get_complaint(db, complaint_id))


@router.post("/{complaint_id}/status", response_model=schemas.ComplaintOut)
def update_status(
    complaint_id: int,
    payload: schemas.ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    c = crud.get_complaint(db, complaint_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if payload.status not in models.COMPLAINT_STATUSES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of {list(models.COMPLAINT_STATUSES)}",
        )

    role = actor.role.role_name
    # Authorization:
    if role == "Customer":
        if c.customer_id != actor.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your complaint")
        if payload.status not in ("Closed", "Pending Customer Response"):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="Customers can only close their own complaint or respond.",
            )
        if payload.status == "Closed" and c.status != "Resolved":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Only Resolved complaints can be closed by the customer",
            )
    elif role == "Agent":
        if c.assigned_to != actor.user_id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, detail="Not assigned to you"
            )
    # Admin/Supervisor: anything goes

    crud.update_complaint_status(
        db,
        c,
        new_status=payload.status,
        actor=actor,
        comment=payload.comment,
        resolution_notes=payload.resolution_notes,
    )
    return _serialize(crud.get_complaint(db, complaint_id))


@router.post("/{complaint_id}/feedback", response_model=schemas.ComplaintOut)
def submit_feedback(
    complaint_id: int,
    payload: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("Customer")),
):
    c = crud.get_complaint(db, complaint_id)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if c.customer_id != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your complaint")
    if c.status not in ("Resolved", "Closed"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be given on Resolved or Closed complaints",
        )
    if c.feedback:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Feedback already submitted"
        )
    crud.create_feedback(db, c, payload.rating, payload.comments)
    return _serialize(crud.get_complaint(db, complaint_id))
