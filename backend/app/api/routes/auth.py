from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings
from app.core.security_tf_cookie import (
    TF_SESSION_COOKIE,
    TFSessionPayload,
    parse_tf_session,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/session", response_model=TFSessionPayload)
async def get_session(request: Request) -> TFSessionPayload:
    cookie = request.cookies.get(TF_SESSION_COOKIE)
    if cookie:
        payload = parse_tf_session(cookie)
        if payload is None:
            raise HTTPException(status_code=401, detail="invalid_session")
        return payload

    if settings.ENVIRONMENT == "local" and settings.EFTF_DEV_EMAIL:
        return TFSessionPayload(
            email=settings.EFTF_DEV_EMAIL,
            group_id=settings.EFTF_DEV_GROUP_ID,
        )

    raise HTTPException(status_code=401, detail="invalid_session")
