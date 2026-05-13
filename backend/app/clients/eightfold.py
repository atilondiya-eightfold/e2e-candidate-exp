"""HTTP client for the Eightfold API v2 (used by the BFF catch-all proxy).

The Authorization header is set per-request by the proxy router based on
the calling user's session (`Bearer` for the JWT-Bearer path, or the
legacy Basic key during the cutover window).
"""

from __future__ import annotations

import httpx

from app.core.config import settings

_client: httpx.AsyncClient | None = None


def get_ef_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.EF_API_BASE_URL,
            headers={"Accept": "application/json"},
            timeout=httpx.Timeout(10.0),
        )
    return _client


async def close_ef_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
