import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security_tf_cookie import (
    TF_SESSION_COOKIE,
    TFURLSafeTimedSerializer,
)


def test_session_round_trip(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    serializer = TFURLSafeTimedSerializer(settings.TF_SESSION_SECRET)
    cookie = serializer.dumps(
        {"email": "test@example.com", "group_id": "test-group"},
        salt=settings.TF_SESSION_SALT,
    )
    client.cookies.set(TF_SESSION_COOKIE, cookie)
    try:
        r = client.get(f"{settings.API_V1_STR}/auth/session")
    finally:
        client.cookies.delete(TF_SESSION_COOKIE)

    assert r.status_code == 200
    assert r.json() == {"email": "test@example.com", "group_id": "test-group"}


def test_session_missing_cookie_returns_401(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    client.cookies.delete(TF_SESSION_COOKIE)

    r = client.get(f"{settings.API_V1_STR}/auth/session")
    assert r.status_code == 401


def test_session_dev_bypass(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "EFTF_DEV_EMAIL", "fixture@example.com")
    monkeypatch.setattr(settings, "EFTF_DEV_GROUP_ID", "fixture-group")

    client.cookies.delete(TF_SESSION_COOKIE)

    r = client.get(f"{settings.API_V1_STR}/auth/session")
    assert r.status_code == 200
    assert r.json()["email"] == "fixture@example.com"


def test_session_real_cookie_wins_over_dev_bypass(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Regression: in non-prod with EFTF_DEV_EMAIL set, a real cookie from the
    parent app must take priority over the dev fallback."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    monkeypatch.setattr(settings, "EFTF_DEV_EMAIL", "fallback@example.com")
    monkeypatch.setattr(settings, "EFTF_DEV_GROUP_ID", "fallback-group")

    serializer = TFURLSafeTimedSerializer(settings.TF_SESSION_SECRET)
    cookie = serializer.dumps(
        {"email": "real@example.com", "group_id": "real-group"},
        salt=settings.TF_SESSION_SALT,
    )
    client.cookies.set(TF_SESSION_COOKIE, cookie)
    try:
        r = client.get(f"{settings.API_V1_STR}/auth/session")
    finally:
        client.cookies.delete(TF_SESSION_COOKIE)

    assert r.status_code == 200
    assert r.json() == {"email": "real@example.com", "group_id": "real-group"}


def test_session_invalid_cookie_does_not_fall_through_to_dev_bypass(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """An invalid/expired cookie must surface as 401, not silently mask the
    failure with the dev fallback."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    monkeypatch.setattr(settings, "EFTF_DEV_EMAIL", "fallback@example.com")
    monkeypatch.setattr(settings, "EFTF_DEV_GROUP_ID", "fallback-group")

    client.cookies.set(TF_SESSION_COOKIE, "garbage-not-a-valid-token")
    try:
        r = client.get(f"{settings.API_V1_STR}/auth/session")
    finally:
        client.cookies.delete(TF_SESSION_COOKIE)

    assert r.status_code == 401


def test_session_rejects_unix_epoch_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Regression: cookies signed with the modern itsdangerous Unix epoch
    must NOT be accepted. The parent app uses the legacy 2011-01-01 epoch;
    accepting Unix-epoch cookies would silently pass cookies that aren't
    actually compatible with the parent's signer."""
    from itsdangerous import URLSafeTimedSerializer

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    serializer = URLSafeTimedSerializer(settings.TF_SESSION_SECRET)
    cookie = serializer.dumps(
        {"email": "x@example.com", "group_id": "x"},
        salt=settings.TF_SESSION_SALT,
    )
    client.cookies.set(TF_SESSION_COOKIE, cookie)
    try:
        r = client.get(f"{settings.API_V1_STR}/auth/session")
    finally:
        client.cookies.delete(TF_SESSION_COOKIE)

    assert r.status_code == 401
