"""JWT Bearer access token mint + cache for the Eightfold API v2.

Mints one access token per `sub` (user email), caches in process,
re-mints on TTL expiry or explicit invalidation. The data-plane proxy
attaches the returned token as `Authorization: Bearer <token>`.

Security: `client_secret` is never logged. Tokens are never logged.
Mint-failure logs include status + sub but not response body.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

SAFETY_MARGIN_S = 60


@dataclass(slots=True)
class CachedToken:
    token: str
    expiry_mono: float


class TokenMintError(Exception):
    def __init__(self, status: int | None, reason: str) -> None:
        super().__init__(reason)
        self.status = status
        self.reason = reason


class TokenCache:
    """Per-`sub` access-token cache with single-flight mint per subject."""

    def __init__(
        self,
        mint_client: httpx.AsyncClient,
        token_path: str,
        client_id: str,
        client_secret: str,
        safety_margin_s: int = SAFETY_MARGIN_S,
    ) -> None:
        self._client = mint_client
        self._token_path = token_path
        self._client_id = client_id
        self._client_secret = client_secret
        self._safety_margin = safety_margin_s
        self._cache: dict[str, CachedToken] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def get(self, sub: str) -> str:
        entry = self._cache.get(sub)
        now = time.monotonic()
        if entry is not None and now < entry.expiry_mono:
            return entry.token

        lock = self._locks.setdefault(sub, asyncio.Lock())
        async with lock:
            entry = self._cache.get(sub)
            now = time.monotonic()
            if entry is not None and now < entry.expiry_mono:
                return entry.token
            token, ttl = await self._mint(sub)
            expiry = time.monotonic() + max(ttl - self._safety_margin, 0)
            self._cache[sub] = CachedToken(token=token, expiry_mono=expiry)
            log.info("ef_oauth.mint sub=%s ttl=%d", sub, ttl)
            return token

    def invalidate(self, sub: str) -> None:
        self._cache.pop(sub, None)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _mint(self, sub: str) -> tuple[str, int]:
        try:
            response = await self._client.post(
                self._token_path,
                data={
                    "grant_type": "jwt_bearer",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "sub": sub,
                },
            )
        except httpx.RequestError as exc:
            log.error("ef_oauth.mint_failed sub=%s status=network", sub)
            raise TokenMintError(status=None, reason=str(exc)) from exc

        if response.status_code != 200:
            log.error(
                "ef_oauth.mint_failed sub=%s status=%d", sub, response.status_code
            )
            raise TokenMintError(
                status=response.status_code,
                reason=f"token endpoint returned {response.status_code}",
            )

        payload = response.json()
        return payload["access_token"], int(payload.get("expires_in", 0))


_token_cache: TokenCache | None = None


def get_token_cache() -> TokenCache:
    if _token_cache is None:
        raise RuntimeError("TokenCache not initialised; call init_token_cache() first")
    return _token_cache


async def init_token_cache() -> None:
    """Construct the module-level cache. Idempotent."""
    global _token_cache
    if _token_cache is not None:
        return
    mint_client = httpx.AsyncClient(
        base_url=_origin_of(settings.EF_OAUTH_TOKEN_URL),
        timeout=httpx.Timeout(settings.EF_OAUTH_TIMEOUT_S),
        headers={"Accept": "application/json"},
    )
    _token_cache = TokenCache(
        mint_client=mint_client,
        token_path=_path_of(settings.EF_OAUTH_TOKEN_URL),
        client_id=settings.EF_OAUTH_CLIENT_ID,
        client_secret=settings.EF_OAUTH_CLIENT_SECRET,
    )


async def close_token_cache() -> None:
    global _token_cache
    if _token_cache is not None:
        await _token_cache.aclose()
        _token_cache = None


def _origin_of(url: str) -> str:
    parsed = httpx.URL(url)
    return f"{parsed.scheme}://{parsed.host}"


def _path_of(url: str) -> str:
    return httpx.URL(url).path or "/"
