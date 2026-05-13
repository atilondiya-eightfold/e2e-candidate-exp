"""Parent-signed session cookie parser.

Verifies a session cookie signed by the parent application using
`itsdangerous`. The shared secret + salt are loaded from env vars; set
them to match your parent app's signer before deploying.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from itsdangerous import BadData, BadSignature, SignatureExpired, URLSafeTimedSerializer
from itsdangerous.timed import TimestampSigner
from pydantic import BaseModel

from app.core.config import settings

log = logging.getLogger(__name__)

TF_SESSION_COOKIE = "_eftf_session"
TF_SESSION_MAX_AGE = 86400 * 7

# The parent app signs cookies with the legacy itsdangerous epoch
# (2011-01-01 UTC, value 1293840000) used by Flask < 2 and itsdangerous < 2.
# Modern itsdangerous (>= 2.0) defaults to the Unix epoch, so without this
# offset our parser interprets parent timestamps as ~41 years in the past
# and rejects every real cookie with SignatureExpired.
_TF_EPOCH_OFFSET = 1293840000


class _TFTimestampSigner(TimestampSigner):
    def get_timestamp(self) -> int:
        return int(time.time()) - _TF_EPOCH_OFFSET

    def timestamp_to_datetime(self, ts: int) -> datetime:
        return datetime.fromtimestamp(ts + _TF_EPOCH_OFFSET, tz=timezone.utc)


class TFURLSafeTimedSerializer(URLSafeTimedSerializer):
    """URLSafeTimedSerializer compatible with the parent app's legacy
    itsdangerous epoch. Public so tests can mint matching cookies."""

    default_signer = _TFTimestampSigner


class TFSessionPayload(BaseModel):
    email: str
    group_id: str
    model_config = {"extra": "ignore"}


def parse_tf_session(cookie: str) -> TFSessionPayload | None:
    serializer = TFURLSafeTimedSerializer(settings.TF_SESSION_SECRET)
    try:
        data = serializer.loads(
            cookie, salt=settings.TF_SESSION_SALT, max_age=TF_SESSION_MAX_AGE
        )
    except (BadSignature, SignatureExpired, BadData) as exc:
        log.warning("tf_session.parse_failed: %s", type(exc).__name__)
        return None
    if not isinstance(data, dict):
        log.warning("tf_session.parse_failed: payload not a dict")
        return None
    return TFSessionPayload.model_validate(data)
