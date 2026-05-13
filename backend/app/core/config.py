from typing import Annotated, Any, Literal

from pydantic import (
    AnyUrl,
    BeforeValidator,
    HttpUrl,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    FRONTEND_HOST: str = "http://localhost:5173"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"

    # Dev-only auth bypass — used by GET /api/v1/auth/session in non-prod env.
    EFTF_DEV_EMAIL: str = "dev@example.com"
    EFTF_DEV_GROUP_ID: str = "example.com"

    # Parent-app session cookie signer values. Must match the parent app's
    # itsdangerous signer to verify real cookies. Empty in `local` is fine
    # (dev fallback fires); non-local boots fail via `_enforce_tf_secret`.
    TF_SESSION_SECRET: str = ""
    TF_SESSION_SALT: str = "session"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str
    SENTRY_DSN: HttpUrl | None = None
    STATIC_DIR: str = "/app/static"

    # --- Eightfold API v2 proxy (BFF) ---
    EF_API_BASE_URL: str = "https://apiv2.eightfold.ai/api/v2"
    EF_OAUTH_TOKEN_URL: str = "https://apiv2.eightfold.ai/oauth/v1/authenticate"
    EF_OAUTH_CLIENT_ID: str = ""
    EF_OAUTH_CLIENT_SECRET: str = ""
    EF_OAUTH_TIMEOUT_S: float = 5.0

    @model_validator(mode="after")
    def _enforce_oauth_creds(self) -> Self:
        if self.ENVIRONMENT == "local":
            return self
        if not self.EF_OAUTH_CLIENT_ID or not self.EF_OAUTH_CLIENT_SECRET:
            raise ValueError(
                "EF_OAUTH_CLIENT_ID and EF_OAUTH_CLIENT_SECRET must be set "
                "in non-local environments."
            )
        return self

    @model_validator(mode="after")
    def _enforce_tf_secret(self) -> Self:
        if self.ENVIRONMENT == "local":
            return self
        if not self.TF_SESSION_SECRET:
            raise ValueError(
                "TF_SESSION_SECRET must be set in non-local environments "
                "to verify the parent-signed _eftf_session cookie."
            )
        return self


settings = Settings()  # type: ignore
