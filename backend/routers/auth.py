"""
Auth routes — registration, login, and current-user lookup.

Login is exposed at /auth/login and also accepts the standard OAuth2
password form (used by Swagger's "Authorize" button) for convenience.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import create_access_token, get_current_user, hash_password, verify_password
from database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])


def _user_out(u: models.User) -> dict:
    return {
        "user_id": u.user_id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role_id": u.role_id,
        "role_name": u.role.role_name,
        "created_at": u.created_at,
    }


@router.post(
    "/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED
)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Open self-registration is only allowed for Customer accounts.
    if payload.role_name != "Customer":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Only Customer accounts can self-register. Ask an admin for staff access.",
        )
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Email {payload.email} is already registered",
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
    return _user_out(user)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    token = create_access_token(subject=user.email, role=user.role.role_name)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_out(user),
    }


# OAuth2-form variant — used by Swagger's "Authorize" widget so you can
# explore protected endpoints from /docs without crafting headers by hand.
@router.post("/token", response_model=schemas.TokenResponse, include_in_schema=False)
def token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user.email, role=user.role.role_name)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_out(user),
    }


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return _user_out(user)
