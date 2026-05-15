# Customer Complaint & Resolution Tracking System — Phase 1

**Capstone:** `AFDE_May26_Sachin_CCRTS`
**Stack:** React (Vite) · FastAPI · SQLite · JWT auth

A full-stack web application that centralizes customer complaint management
with role-based access control, an end-to-end complaint workflow, SLA
tracking, an audit history, and customer feedback collection.

---

## 1. Project Overview

Organizations across telecom, banking, retail, and other industries often
manage customer complaints via scattered emails and spreadsheets. This
leads to slow resolutions, missed SLAs, no accountability, and poor
visibility into complaint trends. The CCRTS replaces that ad-hoc workflow
with a single, role-aware web application:

- **Customers** register, file complaints, track them, and rate the
  resolution.
- **Support Agents** see their assigned queue, update status, and add
  resolution notes.
- **Supervisors** see everything, assign agents, escalate, and monitor SLA
  breaches.
- **Administrators** manage users, categories, and system access.

## 2. Features Implemented

- **Authentication** — JWT (HS256) with bcrypt password hashing; customers
  self-register, staff are created by an admin.
- **Role-based access control** — Admin / Supervisor / Agent / Customer
  enforced via FastAPI dependencies on every protected route.
- **Complaint CRUD with full lifecycle** — Open → Assigned → In Progress →
  Pending Customer Response → Escalated → Resolved → Closed.
- **Audit history** — every status change is captured in
  `complaint_history` with the actor, old/new status, and a comment.
- **Assignment workflow** — supervisors/admins assign agents; agents can
  only act on complaints assigned to them.
- **Customer feedback** — 1–5 star rating + free-text comment after the
  complaint is resolved or closed.
- **SLA tracking** — each priority (Low 72h, Medium 48h, High 24h,
  Critical 4h) drives an SLA target; dashboard surfaces breaches and
  average resolution time.
- **Search & filter** — keyword search on subject/description plus
  filters by status, priority, and category.
- **Role-aware dashboard** — Customers see their own counts; staff see
  global counts, breach metrics, and team headcount.

## 3. Technology Stack

| Layer        | Technology                                       |
|--------------|---------------------------------------------------|
| Frontend     | React 18, React Router 6, Axios, Vite            |
| Styling      | Plain CSS (no Tailwind / no MUI)                 |
| Backend      | Python 3.10+, FastAPI, SQLAlchemy 2              |
| Auth         | JWT (python-jose), bcrypt (passlib)              |
| Database     | SQLite (file-based, zero-config)                 |
| API testing  | Postman / curl / Swagger UI                      |
| Version ctrl | Git + GitHub                                     |

## 4. Project Structure

```
AFDE_May26_Sachin_CCRTS/
├── backend/
│   ├── main.py             # FastAPI entry, CORS, router wiring
│   ├── database.py         # SQLAlchemy engine + session factory
│   ├── auth.py             # JWT issuance, bcrypt, role dependencies
│   ├── models.py           # ORM models: Role, User, Category,
│   │                       #   Complaint, ComplaintHistory, Feedback
│   ├── schemas.py          # Pydantic request/response models
│   ├── crud.py             # DB operations
│   ├── seed_db.py          # Idempotent seed: roles + 7 users + samples
│   └── routers/
│       ├── auth.py         # /auth/register, /auth/login, /auth/me
│       ├── users.py        # admin-only user management
│       ├── categories.py
│       ├── complaints.py   # full lifecycle + assignment + feedback
│       └── dashboard.py    # /dashboard/stats, /roles
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js          # Axios client wrapping every endpoint
│       ├── auth.jsx        # AuthContext + token storage
│       ├── styles/global.css
│       ├── components/     # Navbar, Modal, ProtectedRoute, StatusPill
│       └── pages/          # Login, Register, Dashboard, Complaints,
│                           #   ComplaintNew, ComplaintDetail, Users
├── database/
│   ├── schema.sql          # Reference SQL (SQLAlchemy creates these too)
│   └── seed.sql            # Reference seed (use seed_db.py for users)
├── docs/
│   ├── API.md              # Full endpoint reference with examples
│   ├── SETUP.md            # TL;DR install guide
│   ├── COMMIT_PLAN.md      # 23-commit 3-day plan
│   └── CCRTS.postman_collection.json
├── screenshots/            # UI + Postman screenshots
├── requirements.txt
├── .gitignore
└── README.md
```

## 5. Setup Instructions

### 5.1 Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r ../requirements.txt
python seed_db.py            # creates ccrts.db with demo data
uvicorn main:app --reload --port 8000
```

Verify:
- Health probe — <http://localhost:8000/>
- Swagger docs — <http://localhost:8000/docs>

### 5.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit <http://localhost:5173>.

## 6. Demo Accounts

`seed_db.py` creates seven accounts. **All use password `password123`.**

| Role        | Email                          |
|-------------|--------------------------------|
| Admin       | admin@ccrts.example.com        |
| Supervisor  | supervisor@ccrts.example.com   |
| Agent       | agent1@ccrts.example.com       |
| Agent       | agent2@ccrts.example.com       |
| Customer    | customer1@ccrts.example.com    |
| Customer    | customer2@ccrts.example.com    |
| Customer    | customer3@ccrts.example.com    |

The seed also inserts 4 sample complaints across all four priorities and
several lifecycle states so the dashboard has real numbers from the start.

## 7. API Summary

Base URL: `http://localhost:8000` — all routes except `/auth/login`,
`/auth/register`, and `/` require a bearer token.

| Method | Endpoint                            | Auth required        |
|--------|-------------------------------------|----------------------|
| GET    | `/`                                 | none                 |
| POST   | `/auth/register`                    | none (Customers only)|
| POST   | `/auth/login`                       | none                 |
| GET    | `/auth/me`                          | any                  |
| GET    | `/users`                            | Admin                |
| GET    | `/users/agents`                     | any                  |
| POST   | `/users`                            | Admin                |
| PUT    | `/users/{id}`                       | Admin                |
| DELETE | `/users/{id}`                       | Admin                |
| GET    | `/categories`                       | any                  |
| POST   | `/categories`                       | Admin                |
| DELETE | `/categories/{id}`                  | Admin                |
| GET    | `/complaints`                       | any (auto-scoped)    |
| GET    | `/complaints/{id}`                  | any (owner-checked)  |
| POST   | `/complaints`                       | Customer             |
| POST   | `/complaints/{id}/assign`           | Admin / Supervisor   |
| POST   | `/complaints/{id}/status`           | role-dependent       |
| POST   | `/complaints/{id}/feedback`         | Customer (owner)     |
| GET    | `/dashboard/stats`                  | any                  |
| GET    | `/roles`                            | any                  |

Full request/response examples are in [`docs/API.md`](docs/API.md). A
Postman collection with the login flow pre-wired is in
[`docs/CCRTS.postman_collection.json`](docs/CCRTS.postman_collection.json).

## 8. Screenshots

`screenshots/` should contain (matching the README references):

- `login.png` — Login page
- `register.png` — Customer self-registration
- `dashboard-admin.png` — Admin dashboard with breach metrics
- `dashboard-customer.png` — Customer dashboard
- `complaints.png` — Complaint listing with filters
- `complaint-new.png` — File a complaint form
- `complaint-detail.png` — Complaint detail with history
- `feedback.png` — Feedback submission
- `users.png` — Admin user management
- `swagger.png` — `http://localhost:8000/docs`
- `postman.png` — Postman collection in use

## 9. Out of Scope (Phase 1)

Per the project requirement document, the following are deferred:

- AI-based complaint classification or sentiment analysis
- Chatbot integration
- Voice complaint registration
- Native mobile applications
- Social media / WhatsApp / SMS integration
- Multi-language UI
- Email/SMS notification delivery (the system records notification
  events as audit history; an SMTP integration is a follow-up)

## 10. License

Capstone submission for FDE training — Phase 1.
