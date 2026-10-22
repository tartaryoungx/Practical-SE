"""Shared API error envelope."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

HTTP_ERRORS = {
    400: ("BAD_REQUEST", "The request is invalid."),
    401: ("UNAUTHENTICATED", "Authentication is required."),
    403: ("FORBIDDEN", "You do not have access to this resource."),
    404: ("NOT_FOUND", "The requested resource was not found."),
    409: ("CONFLICT", "The request conflicts with the current state."),
    422: ("VALIDATION", "The request is invalid."),
}


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []
        super().__init__(message)


def error_payload(
    code: str,
    message: str,
    details: list[dict[str, str]] | None = None,
) -> dict[str, dict[str, object]]:
    return {"error": {"code": code, "message": message, "details": details or []}}


def validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    details: list[dict[str, str]] = []
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", ())]
        if location and location[0] in {"body", "query", "path", "header", "cookie"}:
            location = location[1:]
        details.append(
            {
                "field": ".".join(location) or "request",
                "message": str(error.get("msg", "Invalid value")),
            }
        )
    return details


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload(
                "VALIDATION",
                "The request is invalid.",
                validation_details(exc),
            ),
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        code, message = HTTP_ERRORS.get(
            exc.status_code,
            ("HTTP_ERROR", "The request could not be completed."),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(code, message),
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error_handler(
        _request: Request,
        _exc: SQLAlchemyError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content=error_payload(
                "DATABASE_UNAVAILABLE",
                "The database is unavailable.",
            ),
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=error_payload("INTERNAL", "An unexpected error occurred."),
        )
