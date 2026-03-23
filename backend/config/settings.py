import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - defensive fallback
    def load_dotenv(*_: object, **__: object) -> None:  # type: ignore[override]
        return None


def _load_dotenv_if_development() -> None:
    """Load .env files only in development-like environments."""
    env = os.getenv("APP_ENV", "development").lower()
    if env in {"dev", "development", "local"}:
        load_dotenv(override=False)
        load_dotenv(".env.development", override=True)


_load_dotenv_if_development()


class AppSettings(BaseSettings):
    """Central application configuration (env vars + optional .env in dev)."""

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    app_env: str = "development"
    groq_model_name: str = "llama-3.3-70b-versatile"
    embedding_model_name: str = "all-MiniLM-L6-v2"
    embedding_model_cache_dir: str | None = None
    embedding_model_offline: bool = False
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    frontend_dev_url: str = "http://127.0.0.1:5173"
    allowed_origins: str | None = None


@lru_cache()
def get_settings() -> AppSettings:
    """Return cached application settings instance."""
    return AppSettings()


def get_allowed_origins() -> list[str]:
    """Compute allowed CORS origins from config/environment."""
    settings = get_settings()

    if settings.allowed_origins:
        raw = settings.allowed_origins
    else:
        raw = str(settings.frontend_dev_url)

    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Backwards-compatible module-level names (used by rag_pipeline, risk_engine, etc.)
_s = get_settings()
MODEL_NAME = _s.groq_model_name
EMBEDDING_MODEL_NAME = _s.embedding_model_name
EMBEDDING_MODEL_CACHE_DIR = _s.embedding_model_cache_dir
EMBEDDING_MODEL_OFFLINE = _s.embedding_model_offline
API_HOST = _s.api_host
API_PORT = _s.api_port
FRONTEND_DEV_URL = _s.frontend_dev_url
