"""Image checks shared with garment evidence, stored for an outcome rather than a garment."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.returns.policy import ACCEPTED_TYPES, UPLOAD_LIMIT

SIGNATURES = {
    "image/png": lambda data: data.startswith(b"\x89PNG"),
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
}
UPLOAD_MESSAGE = "Choose a JPEG, PNG, or WebP image up to 5 MB."


def upload_dir() -> Path:
    settings = get_settings()
    path = Path(settings.upload_dir)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_image(upload: UploadFile) -> tuple[bytes, str, str]:
    mime = upload.content_type or ""
    if mime not in ACCEPTED_TYPES:
        raise AppError(422, "UPLOAD", UPLOAD_MESSAGE)
    content = upload.file.read(UPLOAD_LIMIT + 1)
    if not content or len(content) > UPLOAD_LIMIT or not SIGNATURES[mime](content):
        raise AppError(422, "UPLOAD", UPLOAD_MESSAGE)
    filename = Path(upload.filename or "evidence").name[:255] or "evidence"
    return content, mime, filename


def write_image(content: bytes, mime: str) -> str:
    storage_name = f"{uuid.uuid4().hex}.{ACCEPTED_TYPES[mime]}"
    (upload_dir() / storage_name).write_bytes(content)
    return storage_name
