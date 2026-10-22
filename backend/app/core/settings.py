"""Runtime configuration shared by FastAPI and Alembic."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    test_database_url: str = ""
    jwt_secret: str = "replace_me"
    jwt_expire_minutes: int = 60
    cookie_name: str = "access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    upload_dir: str = "uploads"
    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "replace_me"
    bootstrap_admin_name: str = "Bootstrap Admin"
    csrf_cookie_name: str = "csrf_token"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            origins = [item.strip() for item in value.split(",") if item.strip()]
        elif isinstance(value, list):
            origins = [str(item).strip() for item in value if str(item).strip()]
        else:
            raise ValueError("CORS origins must be a list of explicit origins")
        if not origins or any(origin == "*" for origin in origins):
            raise ValueError("CORS origins must be explicit and must not use a wildcard")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
