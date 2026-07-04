"""
Relu Consultancy — AI Company Research Assistant
Backend entrypoint (FastAPI).

Workflow implemented (per spec):
  1. User submits a company name or website URL
  2. If a name was given, Serper.dev resolves the official website
  3. The crawler visits key pages (about/products/services/contact/pricing...)
  4. Serper.dev also gathers extra info + competitor candidates
  5. Everything is sent to OpenRouter for AI analysis
  6. Competitors are finalized, report is assembled
  7. Report is returned to the frontend; a PDF can be downloaded on demand
  8. (Bonus) Report + PDF can be auto-sent to a configured Discord channel
"""

import re
import uuid
import httpx
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.models import (
    ResearchRequest, ResearchResponse, CompanyReport, Competitor,
    DiscordSendRequest,
)
from app.services.search_service import SerperService
from app.services.crawler_service import CrawlerService
from app.services.ai_service import OpenRouterService
from app.services.pdf_service import generate_report_pdf
from app.services.discord_service import DiscordService

app = FastAPI(title="Relu Company Research Assistant API", version="1.0.0")

# Wildcard * cannot be used with allow_credentials=True in CORS spec
is_wildcard = "*" in settings.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory report cache — no DB required per spec, just enough to support
# a "Download PDF" button after research completes in the same session.
_REPORT_CACHE: dict[str, dict] = {}

URL_PATTERN = re.compile(r"^https?://", re.IGNORECASE)


def _looks_like_url(query: str) -> bool:
    return bool(URL_PATTERN.match(query.strip())) or "." in query.strip().split()[0] and " " not in query.strip()


def _clean_company_name_from_url(url: str) -> str:
    domain = urlparse(url if URL_PATTERN.match(url) else f"https://{url}").netloc
    domain = domain.replace("www.", "")
    name = domain.split(".")[0]
    return name.capitalize()


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "relu-company-research-backend"}


@app.post("/api/research", response_model=ResearchResponse)
async def research_company(req: ResearchRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Query (company name or URL) is required")

    try:
        serper = SerperService(api_key=req.serper_api_key)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        ai = OpenRouterService(api_key=req.openrouter_api_key, model=req.ai_model)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Step 1-2: resolve to a website + company name
    if _looks_like_url(query):
        website = query if URL_PATTERN.match(query) else f"https://{query}"
        company_name = _clean_company_name_from_url(website)
    else:
        company_name = query
        try:
            website = await serper.find_official_website(company_name)
        except httpx.HTTPError:
            website = None
        if not website:
            raise HTTPException(
                404, f"Could not determine an official website for '{company_name}'"
            )

    # Step 3: crawl the site
    crawler = CrawlerService()
    crawl_result = await crawler.crawl(website)

    # Step 4: gather extra info + competitor candidates via Serper
    try:
        snippets = await serper.gather_company_snippets(company_name)
    except Exception:
        snippets = []
    try:
        competitor_candidates = await serper.find_competitors(company_name)
    except Exception:
        competitor_candidates = []

    # Step 5: send everything to OpenRouter for analysis
    try:
        analysis = await ai.analyze_company(
            company_name=company_name,
            crawled_pages=crawl_result["pages"],
            search_snippets=snippets,
            competitor_candidates=competitor_candidates,
        )
    except Exception as e:
        raise HTTPException(502, f"AI analysis failed: {e}")

    # Step 6: assemble final report
    competitors = [
        Competitor(name=c.get("name", "Unknown"), website=c.get("website"))
        for c in analysis.get("competitor_suggestions", [])
        if c.get("name")
    ]

    report = CompanyReport(
        company_name=analysis.get("company_name") or company_name,
        website=website,
        phone=crawl_result["contact_hints"].get("phone"),
        address=analysis.get("address"),
        products_services=analysis.get("products_services", []),
        pain_points=analysis.get("pain_points", []),
        competitors=competitors,
        summary=analysis.get("summary"),
        pages_crawled=crawl_result["pages_crawled"],
    )

    report_id = str(uuid.uuid4())
    _REPORT_CACHE[report_id] = report.model_dump()

    return ResearchResponse(report=report, report_id=report_id)


@app.get("/api/research/{report_id}/pdf")
async def download_report_pdf(report_id: str):
    report = _REPORT_CACHE.get(report_id)
    if not report:
        raise HTTPException(404, "Report not found. Please run research again.")

    pdf_bytes = generate_report_pdf(report)
    filename = f"{report['company_name'].lower().replace(' ', '-')}-research-report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/discord/send")
async def send_to_discord(req: DiscordSendRequest):
    report = _REPORT_CACHE.get(req.report_id)
    if not report:
        raise HTTPException(404, "Report not found. Please run research again.")

    pdf_bytes = generate_report_pdf(report)
    filename = f"{report['company_name'].lower().replace(' ', '-')}-research-report.pdf"

    discord = DiscordService(bot_token=req.bot_token, channel_id=req.channel_id)
    try:
        result = await discord.send_report(
            applicant_name=req.applicant_name,
            applicant_email=req.applicant_email,
            company_name=req.company_name,
            company_website=req.company_website,
            pdf_bytes=pdf_bytes,
            pdf_filename=filename,
        )
    except Exception as e:
        raise HTTPException(502, f"Failed to send to Discord: {e}")

    return {"status": "sent", "discord_message_id": result.get("id")}
