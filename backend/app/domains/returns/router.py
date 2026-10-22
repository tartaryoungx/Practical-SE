"""Garment routes."""

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_permission
from app.core.security import require_csrf
from app.domains.returns.service import (
    assess,
    confirm_route,
    create_garment,
    evidence_path,
    garment_out,
    get_garment,
    list_garments,
    save_evidence,
)
from app.domains.users.models import User

router = APIRouter(prefix="/garments", tags=["returns"])


class GarmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    material: str
    weight: float


class ConditionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    condition: str


class ConfirmIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    route: str
    note: str = ""


@router.get("")
def read_garments(
    _: User = Depends(require_permission("returns.read")),
    db: Session = Depends(get_db),
) -> list[dict]:
    return [garment_out(db, garment) for garment in list_garments(db)]


@router.post("", status_code=201)
def add_garment(
    body: GarmentCreate,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("returns.create")),
    db: Session = Depends(get_db),
) -> dict:
    return garment_out(db, create_garment(db, user, body.type, body.material, body.weight))


@router.get("/{garment_id}")
def read_garment(
    garment_id: str,
    _: User = Depends(require_permission("returns.read")),
    db: Session = Depends(get_db),
) -> dict:
    return garment_out(db, get_garment(db, garment_id))


@router.patch("/{garment_id}/condition")
def update_condition(
    garment_id: str,
    body: ConditionIn,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("returns.assess")),
    db: Session = Depends(get_db),
) -> dict:
    return garment_out(db, assess(db, garment_id, body.condition))


@router.post("/{garment_id}/evidence")
def upload_evidence(
    garment_id: str,
    _: None = Depends(require_csrf),
    user: User = Depends(require_permission("returns.evidence")),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    return garment_out(db, save_evidence(db, user, garment_id, file))


@router.get("/{garment_id}/evidence/{evidence_id}")
def download_evidence(
    garment_id: str,
    evidence_id: str,
    _: User = Depends(require_permission("returns.read")),
    db: Session = Depends(get_db),
) -> FileResponse:
    path, mime, filename = evidence_path(db, garment_id, evidence_id)
    return FileResponse(path, media_type=mime, filename=filename)


@router.post("/{garment_id}/confirm-route")
def confirm(
    garment_id: str,
    body: ConfirmIn,
    _: None = Depends(require_csrf),
    __: User = Depends(require_permission("returns.confirm")),
    db: Session = Depends(get_db),
) -> dict:
    return garment_out(db, confirm_route(db, garment_id, body.route, body.note))
