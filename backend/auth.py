"""
Authentication & authorization helpers — JWT issuance, bcrypt hashing,
and FastAPI dependencies that gate routes by role.

Tokens are signed with HS256. The SECRET_KEY default below is fine for
local dev; in production set CCRTS_SECRET_KEY in the environment.
"""

import os
from datetime import datetime, timedelta
from typing import Iterable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from database import get_db

SECRET_KEY = os.environ.get(
    "CCRTS_SECRET_KEY",
    "change-me-in-production-this-is-a-dev-only-secret-key-do-not-ship",
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------- Password helpers ----------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ---------- Token helpers ----------
def create_access_token(subject: str, role: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------- Dependencies ----------
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    payload = decode_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="Token missing subject"
        )
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*allowed: str):
    """Factory that returns a dependency enforcing one of the named roles."""

    def dependency(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role.role_name not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=f"Requires role(s): {', '.join(allowed)}",
            )
        return user

    return dependency


# Common role bundles used across routers
def require_admin():
    return require_roles("Admin")


def require_staff():
    """Internal staff = anyone except external Customer."""
    return require_roles("Admin", "Supervisor", "Agent")


def require_supervisor_or_admin():
    return require_roles("Admin", "Supervisor")
