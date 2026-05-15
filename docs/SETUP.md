# Quick Setup — TL;DR

Two terminals.

## Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- Git

## Terminal 1 — Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS/Linux

pip install -r ../requirements.txt
python seed_db.py                # one-time seed
uvicorn main:app --reload --port 8000
```

Verify: <http://localhost:8000/docs>

## Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Verify: <http://localhost:5173>

## Demo accounts (all use `password123`)

- **Admin** — `admin@ccrts.example.com`
- **Supervisor** — `supervisor@ccrts.example.com`
- **Agent** — `agent1@ccrts.example.com`, `agent2@ccrts.example.com`
- **Customer** — `customer1@ccrts.example.com`, `customer2@ccrts.example.com`, `customer3@ccrts.example.com`

## Common Issues

- **CORS errors** — backend not on port 8000, or frontend not on 5173.
  Restart backend first, then frontend.
- **`ModuleNotFoundError: No module named 'jose'`** — re-run
  `pip install -r ../requirements.txt` with venv active.
- **`bcrypt` warning at startup** — harmless on most systems; if it fails
  on Windows, run `pip install bcrypt==4.0.1`.
- **`sqlite3.OperationalError: disk I/O error`** — project is on a
  network/synced drive (OneDrive, Dropbox). Move to a local disk like
  `C:\code\AFDE_May26_Sachin_CCRTS`.
- **Reset DB** — delete `backend/ccrts.db`, then re-run `python seed_db.py`.

## Useful URLs During Demo

- Swagger UI: <http://localhost:8000/docs> (click "Authorize", paste JWT)
- Health: <http://localhost:8000/>
- Dashboard stats (needs token): `curl -H "Authorization: Bearer $TOK" http://localhost:8000/dashboard/stats`
