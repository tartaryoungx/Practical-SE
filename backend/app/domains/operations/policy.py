"""Pure operational rules. Persistence and permissions live in the services."""

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

ELIGIBLE_ROUTE = "THIRD_PARTY_CONTRACTOR"
WEIGHT_STEP = Decimal("0.001")


def quantize_kg(value: Decimal) -> Decimal:
    return value.quantize(WEIGHT_STEP, rounding=ROUND_HALF_UP)


def attention_for(
    *,
    status: str,
    planned_pickup_at: datetime,
    now: datetime,
    sorting_submitted: bool,
    outcome_submitted: bool,
    flagged: bool,
) -> list[str]:
    """Derived indicators. They are not the operational batch status."""
    flags: list[str] = []
    picked_up = status in {"PICKED_UP", "RECEIVED"}
    if planned_pickup_at < now and not picked_up:
        flags.append("DELAYED")
    data_complete = status == "RECEIVED" and sorting_submitted and outcome_submitted
    if data_complete:
        flags.append("COMPLETED")
    else:
        flags.append("PENDING")
        if status == "RECEIVED":
            flags.append("MISSING")
    if flagged:
        flags.append("FLAGGED")
    return flags
