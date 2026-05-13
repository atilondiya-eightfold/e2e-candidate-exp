from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.core.config import settings
from app.core.security_tf_cookie import TF_SESSION_COOKIE, parse_tf_session


def get_current_user_email(request: Request) -> str:
    """Resolve the calling user's Eightfold email.

    Order: TF session cookie first; fall back to EFTF_DEV_EMAIL in `local`
    only when no cookie is present. Raises HTTP 401 when no email can be
    resolved.
    """
    cookie = request.cookies.get(TF_SESSION_COOKIE)
    if cookie:
        payload = parse_tf_session(cookie)
        if payload is None:
            raise HTTPException(status_code=401, detail="invalid_session")
        return payload.email

    if settings.ENVIRONMENT == "local" and settings.EFTF_DEV_EMAIL:
        return settings.EFTF_DEV_EMAIL

    raise HTTPException(status_code=401, detail="invalid_session")


CurrentUserEmail = Annotated[str, Depends(get_current_user_email)]
