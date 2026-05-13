from __future__ import annotations

import httpx
import pytest

from app.clients.ef_oauth import TokenCache, TokenMintError


def _make_cache(handler) -> TokenCache:
    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(
        transport=transport,
        base_url="https://apiv2.eightfold.ai",
        timeout=5.0,
    )
    return TokenCache(
        mint_client=client,
        token_path="/oauth/v1/authenticate",
        client_id="cid",
        client_secret="csecret",
        safety_margin_s=60,
    )


@pytest.mark.asyncio
async def test_mint_success_returns_token() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(
            200,
            json={"access_token": "tok-1", "token_type": "Bearer", "expires_in": 3600},
        )

    cache = _make_cache(handler)
    try:
        token = await cache.get("user@tenant.example.com")
        assert token == "tok-1"
        assert len(calls) == 1
        assert calls[0].method == "POST"
        assert calls[0].url.path == "/oauth/v1/authenticate"
        body = calls[0].content.decode()
        assert "grant_type=jwt_bearer" in body
        assert "client_id=cid" in body
        assert "client_secret=csecret" in body
        assert "sub=user%40tenant.example.com" in body
    finally:
        await cache.aclose()


@pytest.mark.asyncio
async def test_cache_hit_does_not_remint() -> None:
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            200,
            json={"access_token": f"tok-{call_count}", "token_type": "Bearer", "expires_in": 3600},
        )

    cache = _make_cache(handler)
    try:
        t1 = await cache.get("user@x")
        t2 = await cache.get("user@x")
        assert t1 == t2 == "tok-1"
        assert call_count == 1
    finally:
        await cache.aclose()


@pytest.mark.asyncio
async def test_invalidate_forces_remint() -> None:
    counter = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        counter["n"] += 1
        return httpx.Response(
            200,
            json={"access_token": f"tok-{counter['n']}", "token_type": "Bearer", "expires_in": 3600},
        )

    cache = _make_cache(handler)
    try:
        t1 = await cache.get("user@x")
        cache.invalidate("user@x")
        t2 = await cache.get("user@x")
        assert t1 == "tok-1"
        assert t2 == "tok-2"
        assert counter["n"] == 2
    finally:
        await cache.aclose()


@pytest.mark.asyncio
async def test_mint_failure_raises_token_mint_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    cache = _make_cache(handler)
    try:
        with pytest.raises(TokenMintError) as exc_info:
            await cache.get("user@x")
        assert exc_info.value.status == 401
    finally:
        await cache.aclose()


@pytest.mark.asyncio
async def test_secret_never_appears_in_log_records(caplog: pytest.LogCaptureFixture) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"access_token": "tok-1", "token_type": "Bearer", "expires_in": 3600},
        )

    cache = _make_cache(handler)
    try:
        with caplog.at_level("DEBUG"):
            await cache.get("user@x")
        for record in caplog.records:
            assert "csecret" not in record.getMessage()
    finally:
        await cache.aclose()
