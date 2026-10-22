"""Sprint 1 API checks for accounts, permissions, and garment routing."""

import uuid
from datetime import UTC, datetime, timedelta

from app.core.security import token_hash
from app.domains.returns.policy import recommendation_for
from app.domains.users.models import PasswordResetToken

ADMIN = ("admin@example.com", "Adminpass1")
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24


def csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


def login(client, email: str, password: str):
    client.cookies.clear()
    return client.post("/auth/login", json={"email": email, "password": password})


def api(client, method: str, url: str, **kwargs):
    headers = dict(kwargs.pop("headers", {}))
    headers.update(csrf(client))
    return getattr(client, method)(url, headers=headers, **kwargs)


def create_account(client, email: str, role: str, password: str = "Staffpass1") -> dict:
    response = api(
        client,
        "post",
        "/users",
        json={"name": "Test User", "email": email, "password": password, "role": role},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_login_success_failure_and_logout(client) -> None:
    ok = login(client, *ADMIN)
    assert ok.status_code == 200
    assert ok.json()["user"]["role"] == "ADMIN"
    assert "access_token" not in ok.text
    assert client.get("/auth/session").json()["user"]["email"] == ADMIN[0]
    assert client.get("/users/me").status_code == 200
    anonymous = client.get("/users/me")
    # The request above is authenticated. A fresh client check is below.
    assert anonymous.status_code == 200
    assert api(client, "post", "/auth/logout").status_code == 204
    assert client.get("/users/me").status_code == 401
    wrong = login(client, ADMIN[0], "wrong-password")
    unknown = login(client, "missing@example.com", "Adminpass1")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_disabled_account_cannot_authenticate_or_continue(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "disabled.head@example.com", "HEAD")
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/users/me").status_code == 200
    assert login(client, *ADMIN).status_code == 200
    denied = api(client, "patch", f"/users/{user['id']}/status", json={"is_active": False})
    assert denied.status_code == 200
    assert login(client, user["email"], "Staffpass1").status_code == 401
    assert login(client, user["email"], "Staffpass1").json()["error"]["code"] == "CREDENTIALS"
    # Existing session cookie from the disabled user was replaced by the admin login above.
    assert login(client, user["email"], "Staffpass1").status_code == 401


def test_disabled_session_is_rejected(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "session.head@example.com", "HEAD")
    assert login(client, user["email"], "Staffpass1").status_code == 200
    saved = {key: client.cookies.get(key) for key in ("access_token", "csrf_token")}
    assert login(client, *ADMIN).status_code == 200
    assert api(client, "patch", f"/users/{user['id']}/status", json={"is_active": False}).status_code == 200
    client.cookies.clear()
    for key, value in saved.items():
        client.cookies.set(key, value)
    assert client.get("/users/me").status_code == 401


def test_profile_for_each_role(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    accounts = [("admin@example.com", "Adminpass1", "ADMIN")]
    for role, email in (
        ("STORE_STAFF", "profile.staff@example.com"),
        ("CONTRACTOR", "profile.contractor@example.com"),
        ("HEAD", "profile.head@example.com"),
    ):
        create_account(client, email, role)
        accounts.append((email, "Staffpass1", role))
    for email, password, role in accounts:
        assert login(client, email, password).status_code == 200
        me = client.get("/users/me")
        assert me.status_code == 200
        assert me.json()["role"] == role
        assert me.json()["email"] == email
        assert "password" not in me.text


def test_anonymous_profile_is_blocked(client) -> None:
    client.cookies.clear()
    assert client.get("/users/me").status_code == 401
    assert client.get("/auth/session").status_code == 401


def test_admin_lists_and_creates_users(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    created = create_account(client, "new.staff@example.com", "STORE_STAFF")
    listing = client.get("/users")
    assert listing.status_code == 200
    assert any(row["email"] == "new.staff@example.com" and row["is_active"] for row in listing.json())
    duplicate = api(
        client,
        "post",
        "/users",
        json={
            "name": "Dup",
            "email": " NEW.staff@example.com ",
            "password": "Staffpass1",
            "role": "HEAD",
        },
    )
    invalid = api(
        client,
        "post",
        "/users",
        json={"name": "Bad", "email": "bad@example.com", "password": "Staffpass1", "role": "OWNER"},
    )
    assert duplicate.status_code == 409
    assert invalid.status_code == 422
    assert created["role"] == "STORE_STAFF"
    assert login(client, created["email"], "Staffpass1").status_code == 200
    assert client.get("/users").status_code == 403


def test_edit_is_limited_to_name_and_email(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "edit.user@example.com", "HEAD")
    saved = api(
        client,
        "patch",
        f"/users/{user['id']}",
        json={"name": "Edited Name", "email": "edited.user@example.com"},
    )
    assert saved.status_code == 200
    assert saved.json()["name"] == "Edited Name"
    listed = client.get("/users").json()
    assert any(row["email"] == "edited.user@example.com" and row["name"] == "Edited Name" for row in listed)
    protected = api(
        client,
        "patch",
        f"/users/{user['id']}",
        json={"name": "Edited Name", "email": "edited.user@example.com", "role": "ADMIN"},
    )
    assert protected.status_code == 422
    assert client.get("/users").json()
    again = [row for row in client.get("/users").json() if row["id"] == user["id"]][0]
    assert again["role"] == "HEAD"


def test_self_disable_and_last_admin_are_rejected(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    me = client.get("/users/me").json()
    assert api(client, "patch", f"/users/{me['id']}/status", json={"is_active": False}).status_code == 409
    assert api(client, "patch", f"/users/{me['id']}/role", json={"role": "HEAD"}).status_code == 409
    assert client.get("/users/me").json()["role"] == "ADMIN"
    assert client.get("/users/me").json()["is_active"] is True


def test_role_change_affects_the_next_request(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "role.staff@example.com", "STORE_STAFF")
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/garments").status_code == 200
    assert login(client, *ADMIN).status_code == 200
    changed = api(client, "patch", f"/users/{user['id']}/role", json={"role": "HEAD"})
    assert changed.status_code == 200
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/garments").status_code == 403
    assert login(client, *ADMIN).status_code == 200
    granted = api(
        client,
        "put",
        "/roles/HEAD/permissions",
        json={"permissions": ["returns.read", "returns.create"]},
    )
    assert granted.status_code == 200
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/garments").status_code == 200


def test_admin_reset_replaces_the_password(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "reset.user@example.com", "CONTRACTOR")
    generated = api(client, "post", f"/users/{user['id']}/reset-password", json={})
    assert generated.status_code == 200
    temporary = generated.json()["temporary_password"]
    assert temporary
    assert login(client, user["email"], "Staffpass1").status_code == 401
    assert login(client, user["email"], temporary).status_code == 200
    assert login(client, *ADMIN).status_code == 200
    typed = api(
        client,
        "post",
        f"/users/{user['id']}/reset-password",
        json={"password": "Typedpass1"},
    )
    assert typed.status_code == 200
    assert typed.json()["temporary_password"] is None
    assert "Typedpass1" not in typed.text
    assert login(client, user["email"], temporary).status_code == 401
    assert login(client, user["email"], "Typedpass1").status_code == 200
    assert client.get("/users").status_code == 403


def test_change_password_and_valid_reset_token(client, db_session) -> None:
    assert login(client, *ADMIN).status_code == 200
    user = create_account(client, "recover.user@example.com", "HEAD")
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert api(client, "post", "/auth/change-password", json={"current": "wrong", "password": "Changed123"}).status_code == 422
    assert api(client, "post", "/auth/change-password", json={"current": "Staffpass1", "password": "Changed123"}).status_code == 204
    assert login(client, user["email"], "Staffpass1").status_code == 401
    assert login(client, user["email"], "Changed123").status_code == 200
    assert login(client, *ADMIN).status_code == 200
    issued = api(client, "post", f"/users/{user['id']}/reset-link")
    assert issued.status_code == 200
    token = issued.json()["token"]
    assert client.post("/auth/reset-password", json={"token": token, "password": "Recovered1"}).status_code == 204
    assert login(client, user["email"], "Changed123").status_code == 401
    assert login(client, user["email"], "Recovered1").status_code == 200
    expired = PasswordResetToken(
        user_id=uuid.UUID(user["id"]),
        token_hash=token_hash("expired-token"),
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    db_session.add(expired)
    db_session.commit()
    assert client.post("/auth/reset-password", json={"token": "missing-token", "password": "Recovered1"}).status_code == 400
    assert client.post("/auth/reset-password", json={"token": "expired-token", "password": "Otherpass1"}).status_code == 400
    assert login(client, user["email"], "Recovered1").status_code == 200


def test_permission_matrix_and_effective_access(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    matrix = client.get("/roles/permissions")
    assert matrix.status_code == 200
    assert "returns.read" in matrix.json()["STORE_STAFF"]
    assert "returns.read" not in matrix.json()["ADMIN"]
    assert "users.read" in matrix.json()["ADMIN"]
    locked = api(client, "put", "/roles/ADMIN/permissions", json={"permissions": []})
    assert locked.status_code == 409
    unknown = api(client, "put", "/roles/CONTRACTOR/permissions", json={"permissions": ["nope"]})
    assert unknown.status_code == 422
    user = create_account(client, "matrix.contractor@example.com", "CONTRACTOR")
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/roles/permissions").status_code == 403
    assert client.get("/users").status_code == 403
    assert login(client, *ADMIN).status_code == 200
    saved = api(
        client,
        "put",
        "/roles/CONTRACTOR/permissions",
        json={"permissions": ["users.read", "batch.reserved", "returns.read"]},
    )
    assert saved.status_code == 200
    assert login(client, user["email"], "Staffpass1").status_code == 200
    assert client.get("/users").status_code == 403
    assert client.get("/garments").status_code == 200
    assert client.get("/roles/permissions").status_code == 403


def test_garment_routing_evidence_and_confirmation(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    staff = create_account(client, "garment.staff@example.com", "STORE_STAFF")
    other = create_account(client, "garment.other@example.com", "STORE_STAFF")
    assert login(client, staff["email"], "Staffpass1").status_code == 200
    assert client.get("/garments").status_code == 200
    rejected = api(client, "post", "/garments", json={"type": "Shirt", "material": "Cotton", "weight": 0})
    spoofed = api(
        client,
        "post",
        "/garments",
        json={"type": "Shirt", "material": "Cotton", "weight": 0.2, "creatorId": other["id"]},
    )
    assert rejected.status_code == 422
    assert spoofed.status_code == 422
    created = api(client, "post", "/garments", json={"type": "Shirt", "material": "Cotton", "weight": 0.2})
    assert created.status_code == 201
    garment = created.json()
    assert garment["id"].startswith("GR-")
    assert garment["condition"] is None
    assert garment["recommendation"] is None
    assert garment["creatorId"] == staff["id"]
    assert "store" not in created.text
    for condition in ("GOOD", "WORN", "DAMAGED", "STAINED"):
        item = api(client, "post", "/garments", json={"type": condition, "material": "Cotton", "weight": 0.3}).json()
        assessed = api(client, "patch", f"/garments/{item['id']}/condition", json={"condition": condition})
        assert assessed.status_code == 200
        assert assessed.json()["recommendation"] == recommendation_for(condition)
        detail = client.get(f"/garments/{item['id']}")
        assert detail.json()["recommendation"] == recommendation_for(condition)
    damaged = api(client, "post", "/garments", json={"type": "Coat", "material": "Wool", "weight": 0.4}).json()
    assert api(client, "patch", f"/garments/{damaged['id']}/condition", json={"condition": "DAMAGED"}).status_code == 200
    blocked = api(
        client,
        "post",
        f"/garments/{damaged['id']}/confirm-route",
        json={"route": "THIRD_PARTY_CONTRACTOR", "note": ""},
    )
    assert blocked.status_code == 409
    bad = api(
        client,
        "post",
        f"/garments/{damaged['id']}/evidence",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert bad.status_code == 422
    uploaded = api(
        client,
        "post",
        f"/garments/{damaged['id']}/evidence",
        files={"file": ("photo.png", PNG, "image/png")},
    )
    assert uploaded.status_code == 200
    evidence_id = uploaded.json()["evidence"][0]["id"]
    preview = client.get(f"/garments/{damaged['id']}/evidence/{evidence_id}")
    assert preview.status_code == 200
    assert preview.content.startswith(b"\x89PNG")
    blank = api(
        client,
        "post",
        f"/garments/{damaged['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": "   "},
    )
    assert blank.status_code == 422
    confirmed = api(
        client,
        "post",
        f"/garments/{damaged['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": "  Needs review  "},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["confirmedRoute"] == "DIRECT_RESALE_CANDIDATE"
    assert confirmed.json()["note"] == "Needs review"
    assert confirmed.json()["confirmedAt"]
    assert api(client, "patch", f"/garments/{damaged['id']}/condition", json={"condition": "GOOD"}).status_code == 409
    assert api(
        client,
        "post",
        f"/garments/{damaged['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": ""},
    ).status_code == 409
    good = api(client, "post", "/garments", json={"type": "Tee", "material": "Cotton", "weight": 0.1}).json()
    api(client, "patch", f"/garments/{good['id']}/condition", json={"condition": "GOOD"})
    direct = api(
        client,
        "post",
        f"/garments/{good['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": ""},
    )
    assert direct.status_code == 200
    assert login(client, other["email"], "Staffpass1").status_code == 200
    assert any(row["id"] == garment["id"] for row in client.get("/garments").json())
    assert client.get(f"/garments/{garment['id']}").status_code == 200
    assert login(client, *ADMIN).status_code == 200
    assert client.get("/garments").status_code == 403


def test_confirmation_rejects_invalid_unauthorized_and_post_confirm_changes(client) -> None:
    assert login(client, *ADMIN).status_code == 200
    staff = create_account(client, "confirm.staff@example.com", "STORE_STAFF")
    outsider = create_account(client, "confirm.head@example.com", "HEAD")
    head_grants = client.get("/roles/permissions").json()["HEAD"]
    assert api(client, "put", "/roles/HEAD/permissions", json={"permissions": []}).status_code == 200
    assert login(client, staff["email"], "Staffpass1").status_code == 200

    invalid = api(client, "post", "/garments", json={"type": "Route", "material": "Cotton", "weight": 0.2}).json()
    api(client, "patch", f"/garments/{invalid['id']}/condition", json={"condition": "GOOD"})
    rejected_route = api(
        client,
        "post",
        f"/garments/{invalid['id']}/confirm-route",
        json={"route": "RECYCLE", "note": ""},
    )
    assert rejected_route.status_code == 422
    assert client.get(f"/garments/{invalid['id']}").json()["confirmedRoute"] is None

    stained = api(client, "post", "/garments", json={"type": "Stain", "material": "Cotton", "weight": 0.2}).json()
    api(client, "patch", f"/garments/{stained['id']}/condition", json={"condition": "STAINED"})
    missing_evidence = api(
        client,
        "post",
        f"/garments/{stained['id']}/confirm-route",
        json={"route": "THIRD_PARTY_CONTRACTOR", "note": ""},
    )
    assert missing_evidence.status_code == 409
    assert missing_evidence.json()["error"]["code"] == "EVIDENCE"
    assert client.get(f"/garments/{stained['id']}").json()["confirmedRoute"] is None

    ready = api(client, "post", "/garments", json={"type": "Plain", "material": "Cotton", "weight": 0.2}).json()
    api(client, "patch", f"/garments/{ready['id']}/condition", json={"condition": "GOOD"})
    assert login(client, outsider["email"], "Staffpass1").status_code == 200
    denied = api(
        client,
        "post",
        f"/garments/{ready['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": ""},
    )
    assert denied.status_code == 403
    assert login(client, staff["email"], "Staffpass1").status_code == 200
    assert client.get(f"/garments/{ready['id']}").json()["confirmedRoute"] is None
    confirmed = api(
        client,
        "post",
        f"/garments/{ready['id']}/confirm-route",
        json={"route": "DIRECT_RESALE_CANDIDATE", "note": ""},
    )
    assert confirmed.status_code == 200
    late_upload = api(
        client,
        "post",
        f"/garments/{ready['id']}/evidence",
        files={"file": ("late.png", PNG, "image/png")},
    )
    assert late_upload.status_code == 409
    assert late_upload.json()["error"]["code"] == "READ_ONLY"
    assert client.get(f"/garments/{ready['id']}").json()["evidence"] == []

    assert login(client, *ADMIN).status_code == 200
    restored = api(client, "put", "/roles/HEAD/permissions", json={"permissions": head_grants})
    assert restored.status_code == 200
