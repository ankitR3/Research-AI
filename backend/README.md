# Relu Company Research Assistant — Backend

Python (FastAPI) backend for the AI-powered Company Research Assistant.
Given a company name or website URL, it crawls the site, searches the web via
Serper.dev, sends everything to an OpenRouter-hosted AI model for analysis,
identifies competitors, and generates a downloadable PDF report. Optionally
posts the finished report to a Discord channel.

## Stack

- **FastAPI** — HTTP API framework
- **httpx** — async HTTP client (used for Serper, OpenRouter, Discord, and crawling)
- **BeautifulSoup4** — HTML parsing for the crawler
- **ReportLab** — PDF generation
- **OpenRouter** — AI processing (user-selectable model)
- **Serper.dev** — search (site resolution, contact info, competitor discovery)

No database or authentication is used — reports are cached in memory for the
lifetime of the process, just long enough to support the "Download PDF" /
"Send to Discord" actions after a research run.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# then edit .env and fill in your keys (see below)
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes (or per-request) | API key from https://openrouter.ai — used for all AI analysis |
| `OPENROUTER_DEFAULT_MODEL` | No | Fallback model id if the frontend doesn't specify one, e.g. `anthropic/claude-3.5-sonnet` |
| `SERPER_API_KEY` | Yes (or per-request) | API key from https://serper.dev — used for search |
| `DISCORD_BOT_TOKEN` | No (bonus feature) | Discord bot token, only needed for auto-posting reports |
| `DISCORD_CHANNEL_ID` | No (bonus feature) | Target channel ID for Discord auto-posting |
| `ALLOWED_ORIGINS` | No | Comma-separated list of frontend origins allowed by CORS |
| `CRAWLER_MAX_PAGES` | No | Max pages the crawler will visit per site (default 8) |
| `CRAWLER_TIMEOUT_SECONDS` | No | Per-request timeout for crawler fetches (default 10) |

> Note: `OPENROUTER_API_KEY`, `SERPER_API_KEY`, and the Discord credentials can
> also be supplied per-request in the JSON body (this is how the frontend's
> sidebar "Save Configuration" form is expected to work, so the evaluator can
> paste in their own keys at runtime without touching the server's `.env`).

## Running locally

```bash
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger UI) will be available at `http://localhost:8000/docs`.

## API Reference

### `GET /`
Health check.

### `POST /api/research`
Runs the full research pipeline: resolve website → crawl → search → AI analysis → competitors.

```json
// Request
{
  "query": "Tesla",                     // company name OR full URL
  "openrouter_api_key": "sk-or-v1-...", // optional, overrides env
  "serper_api_key": "...",              // optional, overrides env
  "ai_model": "openai/gpt-4o"           // optional, any OpenRouter model id
}
```

```json
// Response (200)
{
  "report_id": "a1b2c3d4-...",
  "report": {
    "company_name": "Tesla",
    "website": "https://www.tesla.com",
    "phone": null,
    "address": "Austin, Texas, United States",
    "products_services": ["Model 3", "Model Y", "Energy Storage", "..."],
    "pain_points": ["...", "..."],
    "competitors": [{"name": "Rivian", "website": "https://rivian.com"}],
    "summary": "...",
    "pages_crawled": ["https://www.tesla.com", "..."]
  }
}
```

### `GET /api/research/{report_id}/pdf`
Streams back the generated PDF for a previously created report (binary, `application/pdf`).

### `POST /api/discord/send`
Sends the report + PDF to a configured Discord channel via the Discord Bot API.

```json
{
  "bot_token": "...",
  "channel_id": "...",
  "applicant_name": "Jane Doe",
  "applicant_email": "jane@example.com",
  "company_name": "Tesla",
  "company_website": "https://www.tesla.com",
  "report_id": "a1b2c3d4-..."
}
```

## Project structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app + route handlers
│   ├── config.py                  # env-based settings
│   ├── models.py                  # Pydantic request/response schemas
│   └── services/
│       ├── search_service.py      # Serper.dev integration
│       ├── crawler_service.py     # website crawler
│       ├── ai_service.py          # OpenRouter integration
│       ├── pdf_service.py         # PDF report generation (ReportLab)
│       └── discord_service.py     # Discord bot posting (bonus)
├── requirements.txt
├── .env.example
└── README.md
```

## Deployment notes

This FastAPI app can be deployed as-is to any platform that runs a Python
ASGI app (Render, Railway, Fly.io) or wrapped as a serverless function for
Vercel (`vercel-python` runtime) — set the environment variables in the
platform's dashboard rather than committing `.env`.
