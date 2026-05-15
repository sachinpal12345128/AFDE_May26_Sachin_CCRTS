"""
Customer Complaint & Resolution Tracking System — FastAPI entry point.

Run with:
    uvicorn main:app --reload --port 8000

Swagger UI: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, engine
from routers import auth, categories, complaints, dashboard, users

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Customer Complaint & Resolution Tracking System API",
    description=(
        "REST API for the CCRTS capstone — manage customers, agents, "
        "complaint lifecycle, SLA tracking, and customer feedback."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "Customer Complaint & Resolution Tracking System",
        "version": "1.0.0",
        "docs": "/docs",
    }


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(complaints.router)
app.include_router(dashboard.router)
