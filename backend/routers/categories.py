"""Category management. Anyone authenticated can list; only Admin can mutate."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from auth import get_current_user, require_admin
from database import get_db

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[schemas.CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    return crud.list_categories(db)


@router.post(
    "", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED
)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin()),
):
    if crud.get_category_by_name(db, payload.category_name):
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Category already exists"
        )
    return crud.create_category(db, payload.category_name)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin()),
):
    cat = crud.get_category(db, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
    crud.delete_category(db, cat)
    return None
