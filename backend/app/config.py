"""
Application configuration.

No database / auth is required per spec. API keys can come from either:
  1. Environment variables (.env) — used as defaults, good for local/dev testing
  2. Per-request fields from the frontend (sidebar "Save Configuration" form)

Per-request keys always take priority over env defaults, since the evaluator
is expected to paste their own OpenRouter / Serper / Discord credentials into
the UI at runtime.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_DEFAULT_MODEL: str = os.getenv(
        "OPENROUTER_DEFAULT_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"
    )
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")
    SERPER_BASE_URL: str = "https://google.serper.dev"

    DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN", "")
    DISCORD_CHANNEL_ID: str = os.getenv("DISCORD_CHANNEL_ID", "")
    DISCORD_API_BASE: str = "https://discord.com/api/v10"

    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")

    CRAWLER_MAX_PAGES: int = int(os.getenv("CRAWLER_MAX_PAGES", "8"))
    CRAWLER_TIMEOUT_SECONDS: int = int(os.getenv("CRAWLER_TIMEOUT_SECONDS", "10"))


settings = Settings()
