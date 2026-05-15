# API Reference — Customer Complaint & Resolution Tracking System

Base URL: `http://localhost:8000`

All errors are returned as:
```json
{ "detail": "Human-readable message" }
```

Most routes require a JWT bearer token, obtained from `POST /auth/login`.

---

## 1. Authentication

### `POST /auth/register`
Customer self-registration. Staff accounts must be created by an admin.

**Request**
```json
{
  "name": "Diya Patel",
  "email": "diya@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

**Response 201** — the created user (no password returned).

**Errors:**
- `400` if `role_name` is not `Customer` (open registration is Customer-only)
- `409` if the email is already in use
- `422` for validation failures

### `POST /auth/login`
Issues a JWT.

**Request**
```json
{ "email": "admin@ccrts.example.com", "password": "password123" }
```

**Response 200**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "user_id": 1,
    "name": "Asha Admin",
    "email": "admin@ccrts.example.com",
    "role_name": "Admin",
    "created_at": "2026-05-15T..."
  }
}
```

Send the token on every subsequent call:
```
Authorization: Bearer eyJhbGciOi...
```

**Errors:** `401` for invalid credentials.

### `GET /auth/me`
Returns the current authenticated user.

---

## 2. Users (Admin only, except `/users/agents`)

### `GET /users?role=Agent`
List users. Optional `role` filter.

### `GET /users/agents`
Convenience endpoint that returns Agents only. Available to any
authenticated user (used by the assignment dropdown in the UI).

### `POST /users`
Create a user with an explicit role.

**Request**
```json
{
  "name": "Cassie Coder",
  "email": "agent3@ccrts.example.com",
  "password": "password123",
  "phone": "9876543299",
  "role_name": "Agent"
}
```

**Errors:** `409` on duplicate email, `400` if `role_name` is unknown.

### `PUT /users/{id}`
Partial update of name, phone, or role.

### `DELETE /users/{id}`
Returns `204`. Cannot delete your own account (`400`).

---

## 3. Categories

### `GET /categories`
List all categories. Any authenticated user.

### `POST /categories`  *(Admin)*
```json
{ "category_name": "Hardware Failure" }
```

### `DELETE /categories/{id}`  *(Admin)*
Returns `204`.

---

## 4. Complaints

### `GET /complaints?status=&priority=&category_id=&search=`

List complaints, automatically scoped to the caller's role:

- **Admin / Supervisor** — sees everything
- **Agent** — sees only complaints assigned to them
- **Customer** — sees only their own complaints

All filter parameters are optional and combine with AND. `search` does a
case-insensitive LIKE across `subject` and `description`.

**Response 200** — array of complaints with denormalized customer/agent
names plus computed `sla_hours` and `sla_breached` fields.

### `GET /complaints/{id}`
Get one complaint with full history and feedback embedded.

**Errors:**
- `404` if not found
- `403` if a Customer tries to read someone else's complaint

### `POST /complaints`  *(Customer)*

**Request**
```json
{
  "category_id": 1,
  "subject": "Charged twice for May invoice",
  "description": "I was billed twice; please refund the duplicate.",
  "priority": "High"
}
```

`priority` must be `Low`, `Medium`, `High`, or `Critical`.
Status starts at `Open`.

### `POST /complaints/{id}/assign`  *(Admin / Supervisor)*
```json
{ "agent_id": 3 }
```

Sets `status` → `Assigned` and stamps `assigned_to`. The target user
must already have the `Agent` role.

### `POST /complaints/{id}/status`

```json
{
  "status": "Resolved",
  "comment": "Refund processed",
  "resolution_notes": "Duplicate charge refunded to original card"
}
```

**Authorization:**
- `Admin` / `Supervisor` can move the complaint to any valid status.
- `Agent` can only update complaints assigned to them.
- `Customer` can move their own complaint to `Closed` (only after
  `Resolved`) or to `Pending Customer Response`.

**Errors:**
- `400` if the status is not in the allowed set.
- `403` if the role isn't authorized for that transition.

### `POST /complaints/{id}/feedback`  *(Customer, owner only)*

```json
{ "rating": 5, "comments": "Quick fix, thanks!" }
```

**Errors:**
- `400` if the complaint isn't `Resolved` or `Closed`.
- `409` if feedback was already submitted.

---

## 5. Dashboard

### `GET /dashboard/stats`

```json
{
  "total_complaints": 5,
  "open_complaints": 2,
  "in_progress": 1,
  "resolved": 1,
  "closed": 1,
  "escalated": 0,
  "sla_breached": 2,
  "avg_resolution_hours": 9.0,
  "total_customers": 3,
  "total_agents": 2
}
```

---

## 6. HTTP Status Code Conventions

| Code | When                                                             |
|------|------------------------------------------------------------------|
| 200  | Successful GET / PUT / POST returning a body                     |
| 201  | Resource created                                                 |
| 204  | Resource deleted                                                 |
| 400  | Business-rule violation (bad status transition, etc.)            |
| 401  | Missing or invalid bearer token                                  |
| 403  | Role not authorized for this operation                           |
| 404  | Resource not found                                               |
| 409  | Unique-constraint conflict (duplicate email, duplicate feedback) |
| 422  | Pydantic validation failure                                      |
| 500  | Unhandled server error                                           |
