from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.core.config import settings
from app.core.security_tf_cookie import TF_SESSION_COOKIE, parse_tf_session


def get_current_user_email(request: Request) -> str:
    """Resolve the calling user's Eightfold email.

    Order in `local`: `?sub=`/`X-Sub` override → TF cookie → EFTF_DEV_EMAIL.
    In non-`local` environments: TF cookie only.
    """
    if settings.ENVIRONMENT == "local":
        override = (
            request.query_params.get("sub")
            or request.headers.get("x-sub")
        )
        if override:
            return override

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
