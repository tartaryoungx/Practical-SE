"""Provisional routing and evidence rules. The backend is the only enforcer."""

from app.domains.returns.models import CONDITIONS, ROUTES

UPLOAD_LIMIT = 5 * 1024 * 1024
ACCEPTED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def recommendation_for(condition: str) -> str:
    if condition == "GOOD":
        return "DIRECT_RESALE_CANDIDATE"
    return "THIRD_PARTY_CONTRACTOR"


def evidence_required(condition: str | None) -> bool:
    return condition in {"DAMAGED", "STAINED"}


def valid_condition(condition: str) -> bool:
    return condition in CONDITIONS


def valid_route(route: str) -> bool:
    return route in ROUTES
