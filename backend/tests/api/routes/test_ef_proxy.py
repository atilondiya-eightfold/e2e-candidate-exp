from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from app.clients import ef_oauth as oauth_module
from app.clients import eightfold as ef_client_module
from app.clients.ef_oauth import TokenCache
from app.core.config import settings
from app.main import app


@pytest.fixture
def fake_clients(monkeypatch: pytest.MonkeyPatch):
    """Replace the data-plane client and TokenCache mint-client with
    transports we control. Returns a state dict so individual tests can
    assert on call counts and tweak responses."""
    state: dict = {
        "data_calls": 0,
        "data_response_status": 200,
        "data_responses": None,
        "mint_calls": 0,
        "mint_status": 200,
        "last_auth_header": None,
    }

    def data_handler(request: httpx.Request) -> httpx.Response:
        state["data_calls"] += 1
        if state["data_responses"] is not None:
            idx = state["data_calls"] - 1
            status = state["data_responses"][min(idx, len(state["data_responses"]) - 1)]
        else:
            status = state["data_response_status"]
        state["last_auth_header"] = request.headers.get("authorization")
        return httpx.Response(status, json={"ok": status == 200})

    def mint_handler(request: httpx.Request) -> httpx.Response:
        state["mint_calls"] += 1
        if state["mint_status"] != 200:
            return httpx.Response(state["mint_status"], json={"error": "x"})
        return httpx.Response(
            200,
            json={
                "access_token": f"tok-{state['mint_calls']}",
                "token_type": "Bearer",
                "expires_in": 3600,
            },
        )

    data_client = httpx.AsyncClient(
        transport=httpx.MockTransport(data_handler),
        base_url=settings.EF_API_BASE_URL,
        headers={"Accept": "application/json"},
        timeout=10.0,
    )
    mint_client = httpx.AsyncClient(
        transport=httpx.MockTransport(mint_handler),
        base_url="https://apiv2.eightfold.ai",
        timeout=5.0,
        headers={"Accept": "application/json"},
    )

    monkeypatch.setattr(ef_client_module, "_client", data_client)
    monkeypatch.setattr(
        oauth_module,
        "_token_cache",
        TokenCache(
            mint_client=mint_client,
            token_path="/oauth/v1/authenticate",
            client_id="cid",
            client_secret="csecret",
        ),
    )
    monkeypatch.setattr(settings, "EF_OAUTH_CLIENT_ID", "cid")
    monkeypatch.setattr(settings, "EF_OAUTH_CLIENT_SECRET", "csecret")
    monkeypatch.setattr(settings, "ENVIRONMENT", "local")
    monkeypatch.setattr(settings, "EFTF_DEV_EMAIL", "dev@tenant.example.com")
    return state


def test_happy_path_attaches_bearer_token(fake_clients) -> None:
    with TestClient(app) as client:
        resp = client.get("/api/v2/core/profiles/me")
    assert resp.status_code == 200
    assert fake_clients["data_calls"] == 1
    assert fake_clients["mint_calls"] == 1
    assert fake_clients["last_auth_header"] == "Bearer tok-1"


def test_no_session_returns_401(monkeypatch: pytest.MonkeyPatch, fake_clients) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with TestClient(app) as client:
        resp = client.get("/api/v2/core/profiles/me")
    assert resp.status_code == 401
    assert fake_clients["mint_calls"] == 0
    assert fake_clients["data_calls"] == 0


def test_upstream_401_triggers_remint_and_retry(fake_clients) -> None:
    fake_clients["data_responses"] = [401, 200]
    with TestClient(app) as client:
        resp = client.get("/api/v2/core/profiles/me")
    assert resp.status_code == 200
    assert fake_clients["data_calls"] == 2
    assert fake_clients["mint_calls"] == 2
    assert fake_clients["last_auth_header"] == "Bearer tok-2"
