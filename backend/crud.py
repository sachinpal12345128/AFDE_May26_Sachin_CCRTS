"""
CRUD layer — DB operations split by entity. Routes stay thin and
delegate everything that touches the database to functions here.
"""

from datetime import datetime
from typing import Iterable, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas


# ---------- Roles ----------
def get_role_by_name(db: Session, name: str) -> Optional[models.Role]:
    return db.query(models.Role).filter(models.Role.role_name == name).first()


def list_roles(db: Session) -> List[models.Role]:
    return db.query(models.Role).order_by(models.Role.role_id).all()


# ---------- Users ----------
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.user_id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def list_users(
    db: Session, role_name: Optional[str] = None
) -> List[models.User]:
    q = db.query(models.User).join(models.Role).order_by(models.User.user_id)
    if role_name:
        q = q.filter(models.Role.role_name == role_name)
    return q.all()


def create_user(
    db: Session,
    name: str,
    email: str,
    password_hash: str,
    phone: Optional[str],
    role: models.Role,
) -> models.User:
    user = models.User(
        name=name,
        email=email,
        password_hash=password_hash,
        phone=phone,
        role_id=role.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_fields(
    db: Session,
    user: models.User,
    name: Optional[str] = None,
    phone: Optional[str] = None,
    role: Optional[models.Role] = None,
) -> models.User:
    if name is not None:
        user.name = name
    if phone is not None:
        user.phone = phone
    if role is not None:
        user.role_id = role.role_id
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: models.User) -> None:
    db.delete(user)
    db.commit()


# ---------- Categories ----------
def list_categories(db: Session) -> List[models.Category]:
    return db.query(models.Category).order_by(models.Category.category_name).all()


def get_category(db: Session, category_id: int) -> Optional[models.Category]:
    return (
        db.query(models.Category)
        .filter(models.Category.category_id == category_id)
        .first()
    )


def get_category_by_name(db: Session, name: str) -> Optional[models.Category]:
    return (
        db.query(models.Category)
        .filter(models.Category.category_name == name)
        .first()
    )


def create_category(db: Session, name: str) -> models.Category:
    cat = models.Category(category_name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, cat: models.Category) -> None:
    db.delete(cat)
    db.commit()


# ---------- Complaints ----------
def get_complaint(db: Session, complaint_id: int) -> Optional[models.Complaint]:
    return (
        db.query(models.Complaint)
        .options(
            joinedload(models.Complaint.customer),
            joinedload(models.Complaint.assigned_agent),
            joinedload(models.Complaint.category),
            joinedload(models.Complaint.feedback),
        )
        .filter(models.Complaint.complaint_id == complaint_id)
        .first()
    )


def list_complaints(
    db: Session,
    *,
    customer_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[models.Complaint]:
    q = db.query(models.Complaint).options(
        joinedload(models.Complaint.customer),
        joinedload(models.Complaint.assigned_agent),
        joinedload(models.Complaint.category),
        joinedload(models.Complaint.feedback),
    )
    if customer_id:
        q = q.filter(models.Complaint.customer_id == customer_id)
    if assigned_to:
        q = q.filter(models.Complaint.assigned_to == assigned_to)
    if status:
        q = q.filter(models.Complaint.status == status)
    if priority:
        q = q.filter(models.Complaint.priority == priority)
    if category_id:
        q = q.filter(models.Complaint.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                models.Complaint.subject.ilike(pattern),
                models.Complaint.description.ilike(pattern),
            )
        )
    return q.order_by(models.Complaint.created_at.desc()).all()


def create_complaint(
    db: Session,
    customer: models.User,
    category: models.Category,
    subject: str,
    description: str,
    priority: str,
) -> models.Complaint:
    c = models.Complaint(
        customer_id=customer.user_id,
        category_id=category.category_id,
        subject=subject,
        description=description,
        priority=priority,
        status="Open",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    # Initial history entry
    add_history(db, c, updater=customer, old_status=None, new_status="Open",
                comment=f"Complaint filed by {customer.name}")
    return c


def assign_complaint(
    db: Session,
    complaint: models.Complaint,
    agent: models.User,
    actor: models.User,
) -> models.Complaint:
    old = complaint.status
    complaint.assigned_to = agent.user_id
    complaint.status = "Assigned"
    db.commit()
    db.refresh(complaint)
    add_history(
        db,
        complaint,
        updater=actor,
        old_status=old,
        new_status="Assigned",
        comment=f"Assigned to agent {agent.name}",
    )
    return complaint


def update_complaint_status(
    db: Session,
    complaint: models.Complaint,
    new_status: str,
    actor: models.User,
    comment: Optional[str] = None,
    resolution_notes: Optional[str] = None,
) -> models.Complaint:
    old = complaint.status
    complaint.status = new_status
    if resolution_notes:
        complaint.resolution_notes = resolution_notes
    now = datetime.utcnow()
    if new_status == "Resolved" and complaint.resolved_at is None:
        complaint.resolved_at = now
    if new_status == "Closed" and complaint.closed_at is None:
        complaint.closed_at = now
    db.commit()
    db.refresh(complaint)
    add_history(
        db,
        complaint,
        updater=actor,
        old_status=old,
        new_status=new_status,
        comment=comment,
    )
    return complaint


def add_history(
    db: Session,
    complaint: models.Complaint,
    updater: models.User,
    old_status: Optional[str],
    new_status: str,
    comment: Optional[str] = None,
) -> models.ComplaintHistory:
    h = models.ComplaintHistory(
        complaint_id=complaint.complaint_id,
        updated_by=updater.user_id,
        old_status=old_status,
        new_status=new_status,
        comment=comment,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


# ---------- Feedback ----------
def create_feedback(
    db: Session, complaint: models.Complaint, rating: int, comments: Optional[str]
) -> models.Feedback:
    fb = models.Feedback(
        complaint_id=complaint.complaint_id, rating=rating, comments=comments
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


# ---------- Dashboard ----------
def get_dashboard_stats(db: Session) -> dict:
    total = db.query(models.Complaint).count()
    by_status = {}
    for s in models.COMPLAINT_STATUSES:
        by_status[s] = (
            db.query(models.Complaint).filter(models.Complaint.status == s).count()
        )

    # Customers & agents (for the "team" stats)
    customers = (
        db.query(models.User)
        .join(models.Role)
        .filter(models.Role.role_name == "Customer")
        .count()
    )
    agents = (
        db.query(models.User)
        .join(models.Role)
        .filter(models.Role.role_name == "Agent")
        .count()
    )

    # SLA breach + avg resolution
    sla_breached, avg_hours = compute_sla_metrics(db)

    return {
        "total_complaints": total,
        "open_complaints": by_status.get("Open", 0) + by_status.get("Assigned", 0),
        "in_progress": by_status.get("In Progress", 0),
        "resolved": by_status.get("Resolved", 0),
        "closed": by_status.get("Closed", 0),
        "escalated": by_status.get("Escalated", 0),
        "sla_breached": sla_breached,
        "avg_resolution_hours": avg_hours,
        "total_customers": customers,
        "total_agents": agents,
    }


def compute_sla_metrics(db: Session):
    """Return (breached_count, avg_resolution_hours_or_None)."""
    breached = 0
    resolutions = []
    now = datetime.utcnow()
    for c in db.query(models.Complaint).all():
        sla = models.PRIORITY_SLA_HOURS.get(c.priority, 48)
        elapsed = ((c.resolved_at or now) - c.created_at).total_seconds() / 3600
        if elapsed > sla and c.status not in ("Closed",):
            breached += 1
        if c.resolved_at:
            resolutions.append(
                (c.resolved_at - c.created_at).total_seconds() / 3600
            )
    avg = round(sum(resolutions) / len(resolutions), 2) if resolutions else None
    return breached, avg
