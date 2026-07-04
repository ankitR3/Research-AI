# AI-Powered Company Research Assistant

A unified fullstack application that enables users to research any company by providing either a company name or website URL. The application automatically crawls key website pages, retrieves search information and contact details via Serper.dev, analyzes data using OpenRouter AI, identifies competitors, generates professional PDF reports, and offers automatic Discord sharing.

---

## Directory Structure

```text
relu-company-assignment/
├── backend/                  # FastAPI Backend application
│   ├── app/
│   │   ├── main.py            # Route handlers & API caching
│   │   ├── config.py          # App settings
│   │   ├── models.py          # Pydantic schemas
│   │   └── services/
│   │       ├── crawler_service.py # BeautifulSoup Crawler
│   │       ├── search_service.py  # Serper.dev lookup
│   │       ├── ai_service.py      # OpenRouter LLM interface
│   │       ├── pdf_service.py     # ReportLab PDF styling
│   │       └── discord_service.py # Discord Bot HTTP client
│   └── .env.example
├── frontend/                 # Next.js Frontend dashboard
│   ├── app/
│   │   ├── page.js            # Main ChatGPT-style page
│   │   ├── layout.js          # Root layout
│   │   └── globals.css        # Premium CSS design tokens
│   └── package.json
└── README.md                 # Unified documentation (this file)
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and configure the following variables:

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes (or in UI) | API key from [OpenRouter](https://openrouter.ai) to process AI summaries/pain points |
| `OPENROUTER_DEFAULT_MODEL` | No | Fallback model ID (default: `anthropic/claude-3.5-sonnet`) |
| `SERPER_API_KEY` | Yes (or in UI) | API key from [Serper.dev](https://serper.dev) for web search |
| `DISCORD_BOT_TOKEN` | No | Token for Discord bot posting (bonus feature) |
| `DISCORD_CHANNEL_ID` | No | Target Discord channel ID (bonus feature) |
| `ALLOWED_ORIGINS` | No | Allowed CORS origins (default: `http://localhost:3000`) |
| `CRAWLER_MAX_PAGES` | No | Max pages crawled per domain (default: `8`) |
| `CRAWLER_TIMEOUT_SECONDS` | No | Crawler requests timeout limit (default: `10`) |

> **Note:** The OpenRouter key, Serper.dev key, and Discord parameters can also be configured directly in the frontend sidebar settings panel. Key configurations entered in the UI will persist in `localStorage` and override backend defaults.

---

## Getting Started

### 1. Start the Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (CMD/PowerShell)
   .\venv\Scripts\activate
   # On Linux/macOS
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend documentation will be accessible at `http://127.0.0.1:8000/docs`.*

---

### 2. Start the Frontend Dashboard

1. Open a new terminal session and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be accessible at `http://localhost:3000`.*

---

## Features Built

- **Double Input Resolution:** Type a company name or URL. Names are resolved to domains using Serper.dev automatically.
- **Optimized Crawling:** Scrapes key pages (Home, About, Pricing, Contact, Solutions, Products) while skipping duplicate pages, login endpoints, and irrelevant directories.
- **Flexible AI Models:** Allow dynamic model changes directly from the UI settings sidebar.
- **Pain Points & Competitors:** Highlights operational/strategic company pain points and maps competitor links in a clean grid.
- **Amber-themed PDF Generation:** Generate professional, styled PDFs with a single click.
- **Discord Bot Webhook:** Easily post generated PDFs and applicant metadata to a configured Discord channel directly from the UI.
