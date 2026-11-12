"""Sprint 2 checks for batches, outcomes, validation, corrections, and report criteria."""

import threading
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, text

from app.core.errors import AppError
from app.domains.users.models import User
from tests.test_sprint import ADMIN, PNG, api, create_account, login

STAFF = [
    "returns.read",
    "returns.create",
    "returns.assess",
    "returns.evidence",
    "returns.confirm",
    "batch.create",
    "batch.read",
    "batch.confirm",
    "batch.pickup",
    "issues.respond",
]
CONTRACTOR = [
    "batch.read",
    "batch.receive",
    "outcome.sorting",
    "outcome.final",
    "issues.respond",
]
HEAD = [
    "batch.read",
    "batch.monitor",
    "validation.read",
    "validation.decide",
    "issues.manage",
    "report.configure",
]


def grant(client, role: str, keys: list[str]) -> None:
    assert login(client, *ADMIN).status_code == 200
    saved = api(client, "put", f"/roles/{role}/permissions", json={"permissions": keys})
    assert saved.status_code == 200, saved.text


def bootstrap(client, prefix: str) -> dict[str, dict]:
    grant(client, "STORE_STAFF", STAFF)
    grant(client, "CONTRACTOR", CONTRACTOR)
    grant(client, "HEAD", HEAD)
    return {
        "staff": create_account(client, f"{prefix}.staff@example.com", "STORE_STAFF"),
        "contractor": create_account(client, f"{prefix}.contractor@example.com", "CONTRACTOR"),
        "other": create_account(client, f"{prefix}.other@example.com", "CONTRACTOR"),
        "head": create_account(client, f"{prefix}.head@example.com", "HEAD"),
    }


def sweep(client, staff: dict, contractor: dict, store: str) -> None:
    assert login(client, staff["email"], "Staffpass1").status_code == 200
    response = api(
        client,
        "post",
        "/batches",
        json={
            "storeCode": store,
            "contractorId": contractor["id"],
            "plannedPickupAt": "2026-12-01T09:00:00+00:00",
        },
    )
    assert response.status_code in {201, 409}, response.text


def confirm_garment(client, garment_id: str, condition: str) -> None:
    assert api(
        client, "patch", f"/garments/{garment_id}/condition", json={"condition": condition}
    ).status_code == 200
    if condition in {"DAMAGED", "STAINED"}:
        uploaded = api(
            client,
            "post",
            f"/garments/{garment_id}/evidence",
            files={"file": ("photo.png", PNG, "image/png")},
        )
        assert uploaded.status_code == 200, uploaded.text
    note = "Contractor handling" if condition == "GOOD" else ""
    confirmed = api(
        client,
        "post",
        f"/garments/{garment_id}/confirm-route",
        json={"route": "THIRD_PARTY_CONTRACTOR", "note": note},
    )
    assert confirmed.status_code == 200, confirmed.text


def eligible(client, staff: dict, store: str | None, weight: float, condition: str = "WORN") -> str:
    assert login(client, staff["email"], "Staffpass1").status_code == 200
    body = {"type": "Shirt", "material": "Cotton", "weight": weight}
    if store:
        body["storeCode"] = store
    created = api(client, "post", "/garments", json=body)
    assert created.status_code == 201, created.text
    if store is None:
        assert "store" not in created.text
    else:
        assert created.json()["storeCode"] == store
    confirm_garment(client, created.json()["id"], condition)
    return created.json()["id"]


def create_batch(client, staff: dict, contractor: dict, store: str, when: str, max_items=None) -> dict:
    assert login(client, staff["email"], "Staffpass1").status_code == 200
    body = {
        "storeCode": store,
        "contractorId": contractor["id"],
        "plannedPickupAt": when,
        "maxItems": max_items,
    }
    response = api(client, "post", "/batches", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_fifo_batch_excludes_ineligible_garments_and_recalculates(client, db_session) -> None:
    people = bootstrap(client, "fifo")
    sweep(client, people["staff"], people["contractor"], "central")
    sweep(client, people["staff"], people["contractor"], "north")
    first = eligible(client, people["staff"], "central", 0.4)
    second = eligible(client, people["staff"], "central", 0.6)
    third = eligible(client, people["staff"], "central", 0.2)
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    direct = api(client, "post", "/garments", json={"type": "Resale", "material": "Cotton", "weight": 0.2, "storeCode": "central"})
    assert direct.status_code == 201
    assert api(client, "patch", f"/garments/{direct.json()['id']}/condition", json={"condition": "GOOD"}).status_code == 200
    assert api(
        client,
        "post",
        f"/garments/{direct.json()['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": ""},
    ).status_code == 200
    unassigned = eligible(client, people["staff"], None, 0.5)
    other_store = eligible(client, people["staff"], "north", 0.5)
    damaged = api(
        client,
        "post",
        "/garments",
        json={"type": "Damaged", "material": "Wool", "weight": 0.4, "storeCode": "central"},
    )
    assert damaged.status_code == 201
    assert api(client, "patch", f"/garments/{damaged.json()['id']}/condition", json={"condition": "DAMAGED"}).status_code == 200
    blocked = api(
        client,
        "post",
        f"/garments/{damaged.json()['id']}/confirm-route",
        json={"route": "THIRD_PARTY_CONTRACTOR", "note": ""},
    )
    assert blocked.status_code == 409

    same = datetime(2026, 3, 1, tzinfo=UTC)
    for garment_id in (first, second, third):
        db_session.execute(
            text("UPDATE garments SET created_at = :ts WHERE id = :id"),
            {"ts": same, "id": garment_id},
        )
    db_session.commit()
    ordered = sorted((first, second, third))
    batch = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "central",
        "2026-12-15T09:00:00+00:00",
        2,
    )
    assert [item["garmentId"] for item in batch["items"]] == ordered[:2]
    assert batch["quantity"] == 2
    weights = {first: 0.4, second: 0.6, third: 0.2}
    assert round(batch["totalWeight"], 3) == round(sum(weights[item] for item in ordered[:2]), 3)
    assert direct.json()["id"] not in {item["garmentId"] for item in batch["items"]}
    assert unassigned not in {item["garmentId"] for item in batch["items"]}
    assert other_store not in {item["garmentId"] for item in batch["items"]}
    assert damaged.json()["id"] not in {item["garmentId"] for item in batch["items"]}
    stored = db_session.execute(
        text("SELECT store_code FROM garments WHERE id = :id"),
        {"id": unassigned},
    ).scalar_one()
    assert stored is None

    removed = ordered[0]
    kept = ordered[1]
    updated = api(client, "delete", f"/batches/{batch['id']}/items/{removed}")
    assert updated.status_code == 200, updated.text
    assert updated.json()["quantity"] == 1
    assert [item["garmentId"] for item in updated.json()["items"]] == [kept]
    assert round(updated.json()["totalWeight"], 3) == round(weights[kept], 3)
    emptied = api(client, "delete", f"/batches/{batch['id']}/items/{kept}")
    assert emptied.status_code == 200
    refused = api(client, "post", f"/batches/{batch['id']}/confirm")
    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "EMPTY"
    assert client.get(f"/batches/{batch['id']}").json()["status"] == "DRAFT"


def test_confirm_pickup_and_assigned_receipt(client) -> None:
    people = bootstrap(client, "pickup")
    sweep(client, people["staff"], people["contractor"], "central")
    garment_id = eligible(client, people["staff"], "central", 0.8)
    batch = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "central",
        "2026-12-20T09:00:00+00:00",
        None,
    )
    assert batch["status"] == "DRAFT"
    assert batch["items"][0]["garmentId"] == garment_id
    early = api(client, "post", f"/batches/{batch['id']}/pickup", json={})
    assert early.status_code == 409
    confirmed = api(client, "post", f"/batches/{batch['id']}/confirm")
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["status"] == "READY_FOR_PICKUP"
    locked = api(client, "delete", f"/batches/{batch['id']}/items/{garment_id}")
    assert locked.status_code == 409
    assert locked.json()["error"]["code"] == "READ_ONLY"
    picked = api(
        client,
        "post",
        f"/batches/{batch['id']}/pickup",
        json={"pickedUpAt": "2026-12-20T11:30:00+00:00"},
    )
    assert picked.status_code == 200, picked.text
    assert picked.json()["status"] == "PICKED_UP"
    assert picked.json()["pickedUpAt"].startswith("2026-12-20T11:30:00")
    again = api(client, "post", f"/batches/{batch['id']}/pickup", json={})
    assert again.status_code == 409

    assert login(client, people["other"]["email"], "Staffpass1").status_code == 200
    hidden = client.get(f"/batches/{batch['id']}")
    assert hidden.status_code == 404
    denied = api(client, "post", f"/batches/{batch['id']}/receive")
    assert denied.status_code == 404
    listing = client.get(f"/batches?contractorId={people['contractor']['id']}")
    assert listing.status_code == 403

    grant(client, "STORE_STAFF", STAFF + ["batch.receive"])
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    staff_receive = api(client, "post", f"/batches/{batch['id']}/receive")
    assert staff_receive.status_code == 403
    grant(client, "STORE_STAFF", STAFF)

    assert login(client, people["contractor"]["email"], "Staffpass1").status_code == 200
    too_soon = api(client, "post", "/batches", json={
        "storeCode": "central",
        "contractorId": people["contractor"]["id"],
        "plannedPickupAt": "2026-12-20T09:00:00+00:00",
    })
    assert too_soon.status_code == 403
    visible = client.get("/batches")
    assert visible.status_code == 200
    assert [row["id"] for row in visible.json() if row["id"] == batch["id"]]
    received = api(client, "post", f"/batches/{batch['id']}/receive")
    assert received.status_code == 200, received.text
    assert received.json()["status"] == "RECEIVED"
    assert received.json()["receivedAt"]
    repeat = api(client, "post", f"/batches/{batch['id']}/receive")
    assert repeat.status_code == 409


def test_sorting_and_final_outcomes_lock_after_submit(client) -> None:
    people = bootstrap(client, "sort")
    sweep(client, people["staff"], people["contractor"], "east")
    eligible(client, people["staff"], "east", 1)
    batch = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "east",
        "2026-12-20T09:00:00+00:00",
        1,
    )
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    api(client, "post", f"/batches/{batch['id']}/confirm")
    api(client, "post", f"/batches/{batch['id']}/pickup", json={})
    assert login(client, people["contractor"]["email"], "Staffpass1").status_code == 200
    early = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": 1, "fibreToFibreKg": 0, "downcyclingKg": 0, "unknownKg": 0},
    )
    assert early.status_code == 409
    assert api(client, "post", f"/batches/{batch['id']}/receive").status_code == 200
    negative = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": -1, "fibreToFibreKg": 0, "downcyclingKg": 0, "unknownKg": 0},
    )
    assert negative.status_code == 422
    over = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": 1.2, "fibreToFibreKg": 0, "downcyclingKg": 0, "unknownKg": 0},
    )
    assert over.status_code == 422
    assert over.json()["error"]["code"] == "TOTAL"
    draft = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": 0.4, "fibreToFibreKg": 0.3, "downcyclingKg": 0.1, "unknownKg": 0},
    )
    assert draft.status_code == 200, draft.text
    assert draft.json()["sorting"]["status"] == "DRAFT"
    assert round(draft.json()["sorting"]["totalKg"], 3) == 0.8
    short = api(client, "post", f"/batches/{batch['id']}/sorting/submit")
    assert short.status_code == 422
    assert short.json()["error"]["code"] == "TOTAL"
    ready = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": 0.4, "fibreToFibreKg": 0.3, "downcyclingKg": 0.2, "unknownKg": 0.1},
    )
    assert ready.status_code == 200, ready.text
    submitted = api(client, "post", f"/batches/{batch['id']}/sorting/submit")
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["sorting"]["status"] == "SUBMITTED"
    assert round(submitted.json()["sorting"]["totalKg"], 3) == 1
    locked = api(
        client,
        "put",
        f"/batches/{batch['id']}/sorting",
        json={"resaleKg": 1, "fibreToFibreKg": 0, "downcyclingKg": 0, "unknownKg": 0},
    )
    assert locked.status_code == 409
    assert locked.json()["error"]["code"] == "READ_ONLY"

    invalid = api(
        client,
        "put",
        f"/batches/{batch['id']}/outcomes",
        json={"items": [{"category": "UNKNOWN", "weight": 1.4, "note": ""}]},
    )
    assert invalid.status_code == 422
    saved = api(
        client,
        "put",
        f"/batches/{batch['id']}/outcomes",
        json={
            "items": [
                {"category": "RESOLD", "weight": 0.4, "note": "Retail partner"},
                {"category": "FIBRE_TO_FIBRE", "weight": 0.3, "note": ""},
                {"category": "DOWNCYCLED", "weight": 0.1, "note": ""},
                {"category": "UNKNOWN", "weight": 0.1, "note": "Not identified"},
            ]
        },
    )
    assert saved.status_code == 200, saved.text
    assert round(saved.json()["finalOutcome"]["totalKg"], 3) == 0.9
    assert any(item["category"] == "UNKNOWN" for item in saved.json()["finalOutcome"]["items"])
    mismatch = api(client, "post", f"/batches/{batch['id']}/outcomes/submit")
    assert mismatch.status_code == 422
    uploaded = api(
        client,
        "post",
        f"/batches/{batch['id']}/outcomes/evidence",
        files={"file": ("outcome.png", PNG, "image/png")},
    )
    assert uploaded.status_code == 200, uploaded.text
    evidence_id = uploaded.json()["finalOutcome"]["evidence"][0]["id"]
    garment_id = batch["items"][0]["garmentId"]
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    assert client.get(f"/garments/{garment_id}").json()["evidence"] == []
    assert login(client, people["contractor"]["email"], "Staffpass1").status_code == 200
    preview = client.get(f"/batches/{batch['id']}/outcomes/evidence/{evidence_id}")
    assert preview.status_code == 200
    assert preview.content.startswith(b"\x89PNG")
    complete = api(
        client,
        "put",
        f"/batches/{batch['id']}/outcomes",
        json={
            "items": [
                {"category": "RESOLD", "weight": 0.4, "note": ""},
                {"category": "FIBRE_TO_FIBRE", "weight": 0.3, "note": ""},
                {"category": "DOWNCYCLED", "weight": 0.2, "note": ""},
                {"category": "UNKNOWN", "weight": 0.1, "note": "Still unknown"},
            ]
        },
    )
    assert complete.status_code == 200, complete.text
    final = api(client, "post", f"/batches/{batch['id']}/outcomes/submit")
    assert final.status_code == 200, final.text
    assert final.json()["finalOutcome"]["status"] == "SUBMITTED"
    changed = api(
        client,
        "put",
        f"/batches/{batch['id']}/outcomes",
        json={"items": [{"category": "DISCARDED", "weight": 1, "note": ""}]},
    )
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "READ_ONLY"


def test_monitoring_validation_and_issue_lifecycle(client, db_session) -> None:
    people = bootstrap(client, "monitor")
    sweep(client, people["staff"], people["contractor"], "central")
    sweep(client, people["staff"], people["other"], "north")
    eligible(client, people["staff"], "central", 1)
    delayed = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "central",
        "2026-06-15T09:00:00+00:00",
        1,
    )
    assert api(client, "post", f"/batches/{delayed['id']}/confirm").status_code == 200
    eligible(client, people["staff"], "north", 1)
    future = create_batch(
        client,
        people["staff"],
        people["other"],
        "north",
        "2026-12-20T09:00:00+00:00",
        1,
    )
    assert login(client, people["head"]["email"], "Staffpass1").status_code == 200
    overview = client.get("/monitoring")
    assert overview.status_code == 200, overview.text
    summary = overview.json()["summary"]
    assert summary["byStatus"]["READY_FOR_PICKUP"] >= 1
    assert summary["delayed"] >= 1
    assert summary["byStatus"]["READY_FOR_PICKUP"] != summary["delayed"] or summary["pending"] >= 1
    filtered = client.get(
        "/monitoring",
        params={
            "status": "READY_FOR_PICKUP",
            "storeCode": "central",
            "contractorId": people["contractor"]["id"],
            "dateFrom": "2026-06-01",
            "dateTo": "2026-06-30",
        },
    )
    assert filtered.status_code == 200, filtered.text
    assert [row["id"] for row in filtered.json()["batches"]] == [delayed["id"]]
    assert "DELAYED" in filtered.json()["batches"][0]["attention"]
    assert filtered.json()["batches"][0]["status"] == "READY_FOR_PICKUP"
    row = db_session.execute(
        text("SELECT store_code, contractor_id, status FROM batches WHERE id = :id"),
        {"id": delayed["id"]},
    ).one()
    assert row.store_code == "central"
    assert str(row.contractor_id) == people["contractor"]["id"]
    assert row.status == "READY_FOR_PICKUP"
    assert future["id"] not in {item["id"] for item in filtered.json()["batches"]}

    checks = client.get(f"/batches/{delayed['id']}/validation")
    assert checks.status_code == 200, checks.text
    assert checks.json()["fullyVerified"] is False
    assert any(not item["passed"] for item in checks.json()["checks"])
    invalid = api(
        client,
        "post",
        f"/batches/{delayed['id']}/validation",
        json={"decision": "VALID", "reason": ""},
    )
    assert invalid.status_code == 409
    assert invalid.json()["error"]["code"] == "INCOMPLETE"
    missing_reason = api(
        client,
        "post",
        f"/batches/{delayed['id']}/validation",
        json={"decision": "FLAGGED", "reason": "   "},
    )
    assert missing_reason.status_code == 422
    flagged = api(
        client,
        "post",
        f"/batches/{delayed['id']}/validation",
        json={"decision": "FLAGGED", "reason": "Pickup is overdue and sorting is missing"},
    )
    assert flagged.status_code == 200, flagged.text
    assert flagged.json()["decision"] == "FLAGGED"
    assert flagged.json()["fullyVerified"] is False
    flagged_list = client.get("/monitoring", params={"storeCode": "central"})
    match = next(row for row in flagged_list.json()["batches"] if row["id"] == delayed["id"])
    assert match["validationDecision"] == "FLAGGED"
    assert "FLAGGED" in match["attention"]

    created = api(
        client,
        "post",
        "/issues",
        json={
            "batchId": delayed["id"],
            "assigneeId": people["staff"]["id"],
            "message": "Record the missing sorting result.",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["status"] == "OPEN"
    other_issue = api(
        client,
        "post",
        "/issues",
        json={
            "batchId": future["id"],
            "assigneeId": people["contractor"]["id"],
            "message": "This belongs to the contractor.",
        },
    )
    assert other_issue.status_code == 201
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    assert client.get("/issues").status_code == 403
    mine = client.get("/issues/mine")
    assert mine.status_code == 200
    assert [row["id"] for row in mine.json()] == [created.json()["id"]]
    hidden = client.get(f"/issues/{other_issue.json()['id']}")
    assert hidden.status_code == 404
    responded = api(
        client,
        "post",
        f"/issues/{created.json()['id']}/respond",
        json={"message": "The pickup date was missed. I will correct the record."},
    )
    assert responded.status_code == 200, responded.text
    assert responded.json()["status"] == "RESPONDED"
    assert login(client, people["contractor"]["email"], "Staffpass1").status_code == 200
    assert client.get(f"/issues/{created.json()['id']}").status_code == 404
    assert login(client, people["head"]["email"], "Staffpass1").status_code == 200
    resolved = api(
        client,
        "post",
        f"/issues/{created.json()['id']}/resolve",
        json={"message": "The explanation is enough."},
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "RESOLVED"
    reopened = api(
        client,
        "post",
        f"/issues/{created.json()['id']}/reopen",
        json={"message": "The sorting total is still missing."},
    )
    assert reopened.status_code == 200, reopened.text
    assert reopened.json()["status"] == "REOPENED"
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    again = api(
        client,
        "post",
        f"/issues/{created.json()['id']}/respond",
        json={"message": "Sorting cannot be recorded until the contractor receives the batch."},
    )
    assert again.status_code == 200
    assert again.json()["status"] == "RESPONDED"


def test_report_counts_only_validated_matching_batches(client) -> None:
    people = bootstrap(client, "report")
    sweep(client, people["staff"], people["contractor"], "central")
    sweep(client, people["staff"], people["other"], "north")
    eligible(client, people["staff"], "central", 1)
    first = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "central",
        "2026-08-10T09:00:00+00:00",
        1,
    )
    _receive_and_submit(client, people, first["id"])
    eligible(client, people["staff"], "north", 1)
    second = create_batch(
        client,
        people["staff"],
        people["other"],
        "north",
        "2026-08-18T09:00:00+00:00",
        1,
    )
    _receive_and_submit(client, people, second["id"], people["other"])
    eligible(client, people["staff"], "central", 1)
    unfinished = create_batch(
        client,
        people["staff"],
        people["contractor"],
        "central",
        "2026-08-12T09:00:00+00:00",
        1,
    )
    assert login(client, people["head"]["email"], "Staffpass1").status_code == 200
    blocked = api(
        client,
        "post",
        f"/batches/{first['id']}/validation",
        json={"decision": "VALID", "reason": ""},
    )
    assert blocked.status_code == 200, blocked.text
    assert blocked.json()["fullyVerified"] is True
    assert api(
        client,
        "post",
        f"/batches/{second['id']}/validation",
        json={"decision": "FLAGGED", "reason": "Weights need another look"},
    ).status_code == 200
    period = {"periodStart": "2026-08-01", "periodEnd": "2026-08-31"}
    all_matches = client.get("/reports/preview", params=period)
    assert all_matches.status_code == 200, all_matches.text
    assert all_matches.json()["matchingCount"] == 1
    by_store = client.get("/reports/preview", params={**period, "storeCode": "central"})
    assert by_store.json()["matchingCount"] == 1
    by_contractor = client.get(
        "/reports/preview",
        params={**period, "contractorId": people["other"]["id"]},
    )
    assert by_contractor.json()["matchingCount"] == 0
    combined = client.get(
        "/reports/preview",
        params={**period, "storeCode": "north", "contractorId": people["contractor"]["id"]},
    )
    assert combined.json()["matchingCount"] == 0
    outside = client.get(
        "/reports/preview",
        params={"periodStart": "2026-09-01", "periodEnd": "2026-09-30", "storeCode": "central"},
    )
    assert outside.json()["matchingCount"] == 0
    saved = api(
        client,
        "post",
        "/reports",
        json={**period, "storeCode": "central", "contractorId": people["contractor"]["id"]},
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["status"] == "DRAFT"
    assert saved.json()["matchingCount"] == 1
    assert unfinished["id"] != saved.json()["id"]
    listed = client.get("/reports")
    assert listed.status_code == 200
    assert any(row["id"] == saved.json()["id"] and row["matchingCount"] == 1 for row in listed.json())


def _receive_and_submit(client, people: dict, batch_id: str, contractor: dict | None = None) -> None:
    assignee = contractor or people["contractor"]
    assert login(client, people["staff"]["email"], "Staffpass1").status_code == 200
    assert api(client, "post", f"/batches/{batch_id}/confirm").status_code == 200
    assert api(client, "post", f"/batches/{batch_id}/pickup", json={}).status_code == 200
    assert login(client, assignee["email"], "Staffpass1").status_code == 200
    assert api(client, "post", f"/batches/{batch_id}/receive").status_code == 200
    saved = api(
        client,
        "put",
        f"/batches/{batch_id}/sorting",
        json={"resaleKg": 0.25, "fibreToFibreKg": 0.25, "downcyclingKg": 0.25, "unknownKg": 0.25},
    )
    assert saved.status_code == 200, saved.text
    assert api(client, "post", f"/batches/{batch_id}/sorting/submit").status_code == 200
    outcomes = api(
        client,
        "put",
        f"/batches/{batch_id}/outcomes",
        json={
            "items": [
                {"category": "RESOLD", "weight": 0.5, "note": ""},
                {"category": "UNKNOWN", "weight": 0.5, "note": "Awaiting identification"},
            ]
        },
    )
    assert outcomes.status_code == 200, outcomes.text
    assert api(client, "post", f"/batches/{batch_id}/outcomes/submit").status_code == 200


def test_concurrent_batches_do_not_share_garments(client, db_session) -> None:
    people = bootstrap(client, "race")
    sweep(client, people["staff"], people["contractor"], "east")
    garment_ids = [eligible(client, people["staff"], "east", 0.3) for _ in range(4)]
    barrier = threading.Barrier(2)
    results: list = []

    def allocate() -> None:
        from app.core.database import SessionLocal
        from app.domains.operations.batch_service import create_batch as create

        session = SessionLocal()
        try:
            barrier.wait(timeout=5)
            user = session.scalar(select(User).where(User.email == people["staff"]["email"]))
            try:
                payload = create(
                    session,
                    user,
                    "east",
                    uuid.UUID(people["contractor"]["id"]),
                    datetime.now(UTC) + timedelta(days=3),
                    None,
                )
                results.append(payload)
            except AppError as exc:
                results.append(exc)
        finally:
            session.close()

    threads = [threading.Thread(target=allocate) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assigned: list[str] = []
    for result in results:
        if isinstance(result, AppError):
            assert result.code in {"EMPTY", "CONFLICT"}
        else:
            assigned.extend(item["garmentId"] for item in result["items"])
    assert sorted(assigned) == sorted(garment_ids)
    assert len(assigned) == len(set(assigned))
    counts = db_session.execute(
        text(
            "SELECT garment_id, count(*) FROM batch_items "
            "WHERE garment_id = ANY(:ids) GROUP BY garment_id"
        ),
        {"ids": garment_ids},
    ).all()
    assert len(counts) == 4
    assert all(count == 1 for _, count in counts)


def test_operational_permissions_are_enforced(client) -> None:
    people = bootstrap(client, "authz")
    client.cookies.clear()
    assert client.get("/batches").status_code == 401
    assert login(client, *ADMIN).status_code == 200
    assert client.get("/batches").status_code == 403
    assert client.get("/monitoring").status_code == 403
    assert api(client, "post", "/reports", json={
        "periodStart": "2026-08-01",
        "periodEnd": "2026-08-31",
    }).status_code == 403
    assert login(client, people["contractor"]["email"], "Staffpass1").status_code == 200
    assert client.get("/monitoring").status_code == 403
    assert client.get("/issues").status_code == 403
    assert login(client, people["head"]["email"], "Staffpass1").status_code == 200
    assert client.get("/monitoring").status_code == 200
    assert api(client, "post", "/batches", json={
        "storeCode": "central",
        "contractorId": people["contractor"]["id"],
        "plannedPickupAt": "2026-12-20T09:00:00+00:00",
    }).status_code == 403


def test_seed_adds_new_permissions_without_restoring_revoked_grants(client, db_session) -> None:
    bootstrap(client, "seed")
    current = client.get("/roles/permissions").json()["STORE_STAFF"]
    reduced = [key for key in current if key != "returns.create"]
    assert api(
        client, "put", "/roles/STORE_STAFF/permissions", json={"permissions": reduced}
    ).status_code == 200
    db_session.execute(text("DELETE FROM role_permissions WHERE permission_key = 'report.configure'"))
    db_session.execute(text("DELETE FROM permissions WHERE key = 'report.configure'"))
    db_session.commit()
    from app.seed import seed_permissions

    seed_permissions(db_session)
    seed_permissions(db_session)
    matrix = client.get("/roles/permissions").json()
    assert "returns.create" not in matrix["STORE_STAFF"]
    assert "report.configure" in matrix["HEAD"]
    count = db_session.execute(
        text("SELECT count(*) FROM permissions WHERE key = 'report.configure'")
    ).scalar_one()
    assert count == 1
    grant(client, "STORE_STAFF", STAFF)
    grant(client, "HEAD", HEAD)
