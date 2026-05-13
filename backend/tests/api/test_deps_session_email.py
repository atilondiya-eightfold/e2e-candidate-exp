from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import CurrentUserEmail
from app.core import security_tf_cookie as cookies
from app.core.config import settings


def _make_app() -> FastAPI:
    app = FastAPI()

    @app.get("/whoami")
    async def whoami(email: CurrentUserEmail) -> dict[str, str]:
        return {"email": email}

    return app


def _mint_cookie(email: str, group_id: str = "tenant.example.com") -> str:
    serializer = cookies.TFURLSafeTimedSerializer(settings.TF_SESSION_SECRET)
    return serializer.dumps(
        {"email": email, "group_id": group_id}, salt=settings.TF_SESSION_SALT
    )


def test_returns_email_when_cookie_valid() -> None:
    client = TestClient(_make_app())
    client.cookies.set(cookies.TF_SESSION_COOKIE, _mint_cookie("real@tenant.example.com"))
    resp = client.get("/whoami")
    assert resp.status_code == 200
    assert resp.json() == {"email": "real@tenant.example.com"}


def test_uses_dev_bypass_when_no_cookie_and_local(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    monkeypatch.setattr(settings, "EFTF_DEV_EMAIL", "dev@tenant.example.com")
    client = TestClient(_make_app())
    resp = client.get("/whoami")
    assert resp.status_code == 200
    assert resp.json() == {"email": "dev@tenant.example.com"}


def test_returns_401_when_no_cookie_and_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    client = TestClient(_make_app())
    resp = client.get("/whoami")
    assert resp.status_code == 401
    assert resp.json() == {"detail": "invalid_session"}


def test_returns_401_when_cookie_garbage() -> None:
    client = TestClient(_make_app())
    client.cookies.set(cookies.TF_SESSION_COOKIE, "not-a-valid-cookie")
    resp = client.get("/whoami")
    assert resp.status_code == 401
