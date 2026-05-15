"""Aggregate stats for the dashboard landing page."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    return crud.get_dashboard_stats(db)


@router.get("/roles", response_model=list[schemas.RoleOut], tags=["Roles"])
def list_roles(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    return crud.list_roles(db)
