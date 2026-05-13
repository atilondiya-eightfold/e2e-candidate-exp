from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.api.routes import ef_proxy
from app.clients.ef_oauth import close_token_cache, init_token_cache
from app.clients.eightfold import close_ef_client
from app.core.config import settings

STATIC_DIR = Path(settings.STATIC_DIR)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await init_token_cache()
    try:
        yield
    finally:
        await close_token_cache()
        await close_ef_client()


_openapi_url = (
    None
    if settings.ENVIRONMENT == "production"
    else f"{settings.API_V1_STR}/openapi.json"
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=_openapi_url,
    generate_unique_id_function=custom_generate_unique_id,
    redirect_slashes=False,
    lifespan=lifespan,
)

if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
# Catch-all proxy forwards everything under /api/v2 to upstream Eightfold.
app.include_router(ef_proxy.router, prefix="/api/v2")


# Serve the built SPA when present (production image). No-op in local dev.
if STATIC_DIR.is_dir():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False, tags=["spa"])
    async def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        target = STATIC_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(STATIC_DIR / "index.html")
