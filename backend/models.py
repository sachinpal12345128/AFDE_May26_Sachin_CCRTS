"""
SQLAlchemy ORM models for the CCRTS.

Entities:
  - roles               : Admin / Supervisor / Agent / Customer
  - users               : authenticated users tied to a single role
  - categories          : complaint categories (Billing, Technical, etc.)
  - complaints          : the main entity
  - complaint_history   : audit trail of every status change
  - feedback            : customer satisfaction after closure
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    # Admin | Supervisor | Agent | Customer

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    complaints_filed = relationship(
        "Complaint",
        back_populates="customer",
        foreign_keys="Complaint.customer_id",
    )
    complaints_assigned = relationship(
        "Complaint",
        back_populates="assigned_agent",
        foreign_keys="Complaint.assigned_to",
    )


class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(100), unique=True, nullable=False)


# Allowed complaint statuses (validated in schemas / routers)
COMPLAINT_STATUSES = (
    "Open",
    "Assigned",
    "In Progress",
    "Pending Customer Response",
    "Escalated",
    "Resolved",
    "Closed",
)

# Allowed priorities and the SLA in hours
PRIORITY_SLA_HOURS = {
    "Low": 72,
    "Medium": 48,
    "High": 24,
    "Critical": 4,
}


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="Medium")
    status = Column(String(50), nullable=False, default="Open")
    assigned_to = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    customer = relationship(
        "User", back_populates="complaints_filed", foreign_keys=[customer_id]
    )
    assigned_agent = relationship(
        "User", back_populates="complaints_assigned", foreign_keys=[assigned_to]
    )
    category = relationship("Category")
    history = relationship(
        "ComplaintHistory",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintHistory.updated_at.desc()",
    )
    feedback = relationship(
        "Feedback",
        back_populates="complaint",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    history_id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(
        Integer, ForeignKey("complaints.complaint_id"), nullable=False
    )
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="history")
    updater = relationship("User")


class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(
        Integer, ForeignKey("complaints.complaint_id"), unique=True, nullable=False
    )
    rating = Column(Integer, nullable=False)  # 1-5
    comments = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="feedback")
