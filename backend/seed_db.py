"""Seed the CCRTS database with realistic demo data."""

from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
import models
from auth import hash_password

ROLES = ["Admin", "Supervisor", "Agent", "Customer"]

CATEGORIES = [
    "Billing Issues",
    "Service Disruption",
    "Product Defects",
    "Technical Problems",
    "Delivery Delays",
    "Account Issues",
    "Customer Service Complaints",
]

DEMO_PASSWORD = "password123"

USERS = [
    ("Asha Admin",      "admin@ccrts.example.com",      "Admin",      "9000000001"),
    ("Sandeep Singh",   "supervisor@ccrts.example.com", "Supervisor", "9000000002"),
    ("Aarav Agent",     "agent1@ccrts.example.com",     "Agent",      "9000000003"),
    ("Bhavna Agent",    "agent2@ccrts.example.com",     "Agent",      "9000000004"),
    ("Chitra Customer", "customer1@ccrts.example.com",  "Customer",   "9000000010"),
    ("Dev Customer",    "customer2@ccrts.example.com",  "Customer",   "9000000011"),
    ("Esha Customer",   "customer3@ccrts.example.com",  "Customer",   "9000000012"),
]

COMPLAINTS = [
    ("customer1@ccrts.example.com", "Billing Issues", "Charged twice for May invoice",
     "I was billed twice for the May invoice. Please refund the duplicate charge.",
     "High", "Assigned", "agent1@ccrts.example.com", 2),
    ("customer1@ccrts.example.com", "Service Disruption", "Internet down since Monday",
     "Home broadband has been completely offline for 3 days.",
     "Critical", "In Progress", "agent2@ccrts.example.com", 1),
    ("customer2@ccrts.example.com", "Product Defects", "Headphones static noise on left side",
     "Bought a pair last week, left ear has constant crackling.",
     "Medium", "Open", None, 0),
    ("customer3@ccrts.example.com", "Delivery Delays", "Order #45821 delayed by 7 days",
     "Expected delivery 8 May, still not received as of today.",
     "Low", "Resolved", "agent1@ccrts.example.com", 5),
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        role_map = {}
        for r in ROLES:
            row = db.query(models.Role).filter_by(role_name=r).first()
            if not row:
                row = models.Role(role_name=r); db.add(row); db.flush()
            role_map[r] = row

        cat_map = {}
        for name in CATEGORIES:
            row = db.query(models.Category).filter_by(category_name=name).first()
            if not row:
                row = models.Category(category_name=name); db.add(row); db.flush()
            cat_map[name] = row

        user_map = {}
        added_u = 0
        for name, email, role_name, phone in USERS:
            row = db.query(models.User).filter_by(email=email).first()
            if not row:
                row = models.User(
                    name=name, email=email,
                    password_hash=hash_password(DEMO_PASSWORD),
                    phone=phone, role_id=role_map[role_name].role_id,
                )
                db.add(row); db.flush(); added_u += 1
            user_map[email] = row
        db.commit()

        if db.query(models.Complaint).count() == 0:
            for cust_email, cat_name, subject, desc, priority, status, agent_email, days_old in COMPLAINTS:
                customer = user_map[cust_email]
                cat = cat_map[cat_name]
                created = datetime.utcnow() - timedelta(days=days_old)
                c = models.Complaint(
                    customer_id=customer.user_id,
                    category_id=cat.category_id,
                    subject=subject, description=desc,
                    priority=priority, status=status,
                    created_at=created, updated_at=created,
                )
                if agent_email:
                    c.assigned_to = user_map[agent_email].user_id
                if status == "Resolved":
                    c.resolved_at = created + timedelta(hours=18)
                    c.resolution_notes = "Issue resolved after investigation."
                db.add(c); db.flush()

                db.add(models.ComplaintHistory(
                    complaint_id=c.complaint_id, updated_by=customer.user_id,
                    old_status=None, new_status="Open",
                    comment="Filed by " + customer.name,
                    updated_at=created,
                ))
                if status != "Open" and agent_email:
                    db.add(models.ComplaintHistory(
                        complaint_id=c.complaint_id,
                        updated_by=user_map["supervisor@ccrts.example.com"].user_id,
                        old_status="Open", new_status="Assigned",
                        comment="Assigned to " + user_map[agent_email].name,
                        updated_at=created + timedelta(hours=2),
                    ))
                if status in ("In Progress", "Resolved"):
                    db.add(models.ComplaintHistory(
                        complaint_id=c.complaint_id,
                        updated_by=user_map[agent_email].user_id,
                        old_status="Assigned", new_status="In Progress",
                        comment="Investigating",
                        updated_at=created + timedelta(hours=6),
                    ))
                if status == "Resolved":
                    db.add(models.ComplaintHistory(
                        complaint_id=c.complaint_id,
                        updated_by=user_map[agent_email].user_id,
                        old_status="In Progress", new_status="Resolved",
                        comment="Replacement dispatched to customer",
                        updated_at=created + timedelta(hours=18),
                    ))
            db.commit()
            print("Seeded", len(COMPLAINTS), "sample complaints with history.")
        else:
            print("Complaints already present - skipping complaint seed.")

        print("Roles:", len(ROLES), "Categories:", len(CATEGORIES), "Users added:", added_u)
        print()
        print("Demo login (all users use password 'password123'):")
        for name, email, role_name, _phone in USERS:
            print("  " + role_name.ljust(11) + "  " + email)
    finally:
        db.close()


if __name__ == "__main__":
    main()
