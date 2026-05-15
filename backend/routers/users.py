"""Admin-only user management."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, hash_password, require_admin
from database import get_db

router = APIRouter(prefix="/users", tags=["Users"])


def _out(u: models.User) -> dict:
    return {
        "user_id": u.user_id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role_id": u.role_id,
        "role_name": u.role.role_name,
        "created_at": u.created_at,
    }


@router.get("", response_model=List[schemas.UserOut])
def list_users(
    role: Optional[str] = Query(None, description="Filter by role name"),
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin()),
):
    return [_out(u) for u in crud.list_users(db, role_name=role)]


@router.get("/agents", response_model=List[schemas.UserOut])
def list_agents(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Anyone authenticated can fetch the agent list (used in the assign dropdown)."""
    return [_out(u) for u in crud.list_users(db, role_name="Agent")]


@router.post(
    "", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED
)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin()),
):
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Email already in use"
        )
    role = crud.get_role_by_name(db, payload.role_name)
    if not role:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unknown role")
    user = crud.create_user(
        db,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role=role,
    )
    return _out(user)


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin()),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    role = None
    if payload.role_name:
        role = crud.get_role_by_name(db, payload.role_name)
        if not role:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, detail="Unknown role"
            )
    crud.update_user_fields(db, user, name=payload.name, phone=payload.phone, role=role)
    return _out(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin()),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.user_id == admin.user_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account"
        )
    crud.delete_user(db, user)
    return None
