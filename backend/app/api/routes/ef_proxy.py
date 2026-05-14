"""Catch-all BFF proxy for Eightfold API v2.

Auth: per-request JWT Bearer minted from the calling user's session
email by `app.clients.ef_oauth.TokenCache`. The proxy retries once on
an upstream 401 after invalidating the cached token.
"""

from __future__ import annotations

import json
import logging

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

from app.api.deps import CurrentUserEmail
from app.clients.ef_oauth import TokenMintError, get_token_cache
from app.clients.eightfold import get_ef_client
from app.core.config import settings
from app.services.mock_eightfold import mock_for

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ef-proxy"])

_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def _passthrough_headers(request: Request) -> dict[str, str]:
    headers: dict[str, str] = {}
    content_type = request.headers.get("content-type")
    if content_type:
        headers["content-type"] = content_type
    # Some upstream endpoints (candidate-prep voice mock) use request.host
    # to embed publicly-reachable callback URLs in the LiveKit JWT. When
    # talking to a local dev backend on localhost:8003 the agent worker
    # can't reach `localhost`, so optionally pin the Host the upstream sees.
    host_override = getattr(settings, "EF_API_HOST_OVERRIDE", "")
    if host_override:
        headers["host"] = host_override
    return headers


@router.api_route("/{path:path}", methods=_METHODS)
async def proxy(path: str, request: Request, sub: CurrentUserEmail) -> Response:
    if ".." in path.split("/"):
        raise HTTPException(status_code=400, detail={"error": "InvalidPath"})

    cache = get_token_cache()
    client = get_ef_client()
    body = await request.body()
    headers = _passthrough_headers(request)
    # BFF-internal context params (frontend → BFF only). Strip before
    # forwarding upstream so strict endpoints don't 400 on unknown keys.
    _BFF_CTX = {"sub", "application_id", "position_id", "group_id", "profile_id"}
    upstream_params = [
        (k, v) for k, v in request.query_params.multi_items() if k not in _BFF_CTX
    ]

    def _maybe_mock() -> Response | None:
        if settings.ENVIRONMENT != "local":
            return None
        if request.method != "GET":
            return None
        body = mock_for(path, dict(request.query_params))
        if body is None:
            return None
        return Response(
            content=json.dumps(body),
            status_code=200,
            media_type="application/json",
            headers={"X-Mock-Fallback": "true"},
        )

    async def _send() -> httpx.Response | Response:
        try:
            token = await cache.get(sub)
        except TokenMintError as exc:
            mock = _maybe_mock()
            if mock is not None:
                return mock
            raise HTTPException(
                status_code=502,
                detail={"error": "AuthMintFailed", "status": exc.status},
            ) from exc
        try:
            return await client.request(
                method=request.method,
                url=f"/{path}",
                params=upstream_params,
                content=body if body else None,
                headers={**headers, "Authorization": f"Bearer {token}"},
            )
        except httpx.RequestError as exc:
            mock = _maybe_mock()
            if mock is not None:
                return mock
            raise HTTPException(
                status_code=502,
                detail={"error": "UpstreamUnreachable", "message": str(exc)},
            ) from exc

    upstream = await _send()
    if isinstance(upstream, Response):
        return upstream
    if upstream.status_code == 401:
        cache.invalidate(sub)
        retried = await _send()
        if isinstance(retried, Response):
            return retried
        upstream = retried

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )
