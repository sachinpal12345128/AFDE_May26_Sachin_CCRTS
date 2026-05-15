# Suggested 3-Day Commit Plan

The evaluation rewards **incremental daily commits**, not bulk uploads.
Use this as a guide to slice the existing build into a realistic Git history.

## Day 1 — Foundation & Backend Auth

1. `chore: initialize repository with project structure and gitignore`
2. `feat(db): add SQLite schema and seed.sql reference`
3. `feat(backend): scaffold FastAPI app with database session factory`
4. `feat(models): add Role, User, Category models`
5. `feat(auth): implement bcrypt hashing and JWT issuance helpers`
6. `feat(auth): role-based dependencies (require_admin, require_staff)`
7. `feat(api): /auth/register and /auth/login endpoints`
8. `feat(api): /users admin CRUD with email-uniqueness guard`

## Day 2 — Complaint Workflow + Frontend Core

9.  `feat(models): add Complaint, ComplaintHistory, Feedback models`
10. `feat(crud): complaint lifecycle helpers with audit history`
11. `feat(api): /complaints list with role-aware scoping`
12. `feat(api): /complaints create + assign + status update endpoints`
13. `feat(api): /complaints/{id}/feedback after-resolution flow`
14. `feat(api): /dashboard/stats with SLA breach computation`
15. `feat(seed): demo data — 4 roles, 7 users, 4 sample complaints`
16. `chore(frontend): scaffold Vite + React + React Router`
17. `feat(frontend): AuthContext with JWT in localStorage + interceptors`
18. `feat(frontend): Login and Register pages`

## Day 3 — Frontend Polish, Docs, Submission

19. `feat(frontend): role-aware Dashboard with breach metrics`
20. `feat(frontend): Complaints list with filter/search`
21. `feat(frontend): New Complaint form + role-aware action buttons`
22. `feat(frontend): Complaint Detail with history, assign, status, feedback modals`
23. `feat(frontend): Admin Users management page`
24. `docs: README, API.md, SETUP.md, Postman collection`
25. `chore: UI + Postman screenshots`
26. `docs: final README polish and submission notes`

## Commit Hygiene Tips

- Use conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`) — easy "GitHub practices" points.
- Keep each commit focused on one logical change.
- Push at least twice a day — once before lunch, once before EOD.
- The evaluator looks at commit **cadence**, not just the final state.
