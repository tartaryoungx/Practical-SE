"""FastAPI application composition."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import register_error_handlers
from app.core.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Garment Returns API")
    register_error_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Authorization",
            "Content-Type",
            "X-CSRF-Token",
            "X-Requested-With",
        ],
    )
    from app.domains.access_control.router import router as access_router
    from app.domains.auth.router import router as auth_router
    from app.domains.returns.router import router as returns_router
    from app.domains.users.router import router as users_router

    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(access_router)
    app.include_router(returns_router)

    @app.get("/health")
    def health(db: Session = Depends(get_db)) -> dict[str, str]:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}

    return app


app = create_app()
