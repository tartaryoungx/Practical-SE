"""Permission catalog.

Sprint 1 account and return keys stay in place. Sprint 2 adds operational keys
for batches, outcomes, validation, data issues, and draft report configuration.
Reserved keys remain inactive placeholders.
"""

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
    {"key": "batch.create", "group": "Batch", "label": "Create and review pickup batches", "reserved": False},
    {"key": "batch.read", "group": "Batch", "label": "View pickup batches", "reserved": False},
    {"key": "batch.confirm", "group": "Batch", "label": "Confirm pickup batches", "reserved": False},
    {"key": "batch.pickup", "group": "Batch", "label": "Record batch pickup", "reserved": False},
    {"key": "batch.receive", "group": "Batch", "label": "Confirm assigned batch receipt", "reserved": False},
    {"key": "batch.monitor", "group": "Batch", "label": "Monitor batch progress", "reserved": False},
    {"key": "outcome.reserved", "group": "Outcome", "label": "Reserved access", "reserved": True},
    {
        "key": "outcome.sorting",
        "group": "Outcome",
        "label": "Record and submit sorting results",
        "reserved": False,
    },
    {
        "key": "outcome.final",
        "group": "Outcome",
        "label": "Record and submit final outcomes",
        "reserved": False,
    },
    {
        "key": "validation.reserved",
        "group": "Validation",
        "label": "Reserved access",
        "reserved": True,
    },
    {
        "key": "validation.read",
        "group": "Validation",
        "label": "Review batch validation checks",
        "reserved": False,
    },
    {
        "key": "validation.decide",
        "group": "Validation",
        "label": "Confirm or flag batch data",
        "reserved": False,
    },
    {
        "key": "issues.manage",
        "group": "Validation",
        "label": "Request and review data corrections",
        "reserved": False,
    },
    {
        "key": "issues.respond",
        "group": "Validation",
        "label": "Respond to assigned data issues",
        "reserved": False,
    },
    {"key": "report.reserved", "group": "Report", "label": "Reserved access", "reserved": True},
    {
        "key": "report.configure",
        "group": "Report",
        "label": "Configure draft report criteria",
        "reserved": False,
    },
)

ACCOUNT_KEYS = tuple(item["key"] for item in PERMISSIONS if item["group"] == "Account")
RETURN_KEYS = tuple(item["key"] for item in PERMISSIONS if item["group"] == "Return")
PERMISSION_KEYS = tuple(item["key"] for item in PERMISSIONS)

INITIAL_GRANTS = {
    "ADMIN": ACCOUNT_KEYS,
    "STORE_STAFF": RETURN_KEYS
    + (
        "batch.create",
        "batch.read",
        "batch.confirm",
        "batch.pickup",
        "issues.respond",
    ),
    "CONTRACTOR": (
        "batch.read",
        "batch.receive",
        "outcome.sorting",
        "outcome.final",
        "issues.respond",
    ),
    "HEAD": (
        "batch.read",
        "batch.monitor",
        "validation.read",
        "validation.decide",
        "issues.manage",
        "report.configure",
    ),
}
