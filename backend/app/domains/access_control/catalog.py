"""Stable permission catalog for Sprint 1."""

from typing import TypedDict


class PermissionDef(TypedDict):
    key: str
    group: str
    label: str
    reserved: bool


PERMISSIONS: tuple[PermissionDef, ...] = (
    {"key": "users.read", "group": "Account", "label": "View users", "reserved": False},
    {"key": "users.create", "group": "Account", "label": "Create users", "reserved": False},
    {"key": "users.edit", "group": "Account", "label": "Edit name and email", "reserved": False},
    {
        "key": "users.status",
        "group": "Account",
        "label": "Disable or reactivate accounts",
        "reserved": False,
    },
    {
        "key": "users.reset",
        "group": "Account",
        "label": "Reset passwords and issue recovery links",
        "reserved": False,
    },
    {"key": "users.role", "group": "Account", "label": "Assign roles", "reserved": False},
    {"key": "access.read", "group": "Account", "label": "View permissions", "reserved": False},
    {"key": "access.write", "group": "Account", "label": "Configure permissions", "reserved": False},
    {"key": "returns.read", "group": "Return", "label": "View garments and evidence", "reserved": False},
    {"key": "returns.create", "group": "Return", "label": "Record garments", "reserved": False},
    {"key": "returns.assess", "group": "Return", "label": "Assess condition", "reserved": False},
    {"key": "returns.evidence", "group": "Return", "label": "Attach evidence", "reserved": False},
    {
        "key": "returns.confirm",
        "group": "Return",
        "label": "Confirm or override route",
        "reserved": False,
    },
    {"key": "batch.reserved", "group": "Batch", "label": "Reserved access", "reserved": True},
    {"key": "outcome.reserved", "group": "Outcome", "label": "Reserved access", "reserved": True},
    {
        "key": "validation.reserved",
        "group": "Validation",
        "label": "Reserved access",
        "reserved": True,
    },
    {"key": "report.reserved", "group": "Report", "label": "Reserved access", "reserved": True},
)

ACCOUNT_KEYS = tuple(item["key"] for item in PERMISSIONS if item["group"] == "Account")
RETURN_KEYS = tuple(item["key"] for item in PERMISSIONS if item["group"] == "Return")
PERMISSION_KEYS = tuple(item["key"] for item in PERMISSIONS)

INITIAL_GRANTS = {
    "ADMIN": ACCOUNT_KEYS,
    "STORE_STAFF": RETURN_KEYS,
    "CONTRACTOR": (),
    "HEAD": (),
}
