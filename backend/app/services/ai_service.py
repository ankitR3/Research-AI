"""
OpenRouter integration.

All AI reasoning (company summary, products/services extraction,
pain-point generation, competitor suggestions) is routed through
OpenRouter's chat completions endpoint so the frontend can let the
user pick any supported model.
"""

import json
import httpx
from app.config import settings

SYSTEM_PROMPT = """You are a company research analyst. Given raw crawled website \
content and search snippets about a company, produce a structured JSON analysis.

Respond with ONLY valid JSON (no markdown fences, no preamble) matching exactly \
this schema:
{
  "company_name": string,
  "summary": string,
  "products_services": [string, ...],
  "pain_points": [string, ...],   // 3-5 plausible business pain points, inferred from the company's market position, products, and public info
  "address": string or null,
  "competitor_suggestions": [{"name": string, "website": string or null}, ...]  // up to 5, from your own knowledge plus provided candidates
}

Be specific and factual where possible. Pain points should read like genuine \
strategic/operational challenges a company like this would face, not generic filler."""


class OpenRouterService:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_DEFAULT_MODEL
        if not self.api_key:
            raise ValueError("OpenRouter API key is missing")

    async def analyze_company(
        self,
        company_name: str,
        crawled_pages: dict[str, str],
        search_snippets: list[str],
        competitor_candidates: list[dict],
    ) -> dict:
        crawled_text = "\n\n".join(
            f"[PAGE: {url}]\n{text}" for url, text in crawled_pages.items()
        )[:12000]  # keep prompt within reasonable token budget

        user_prompt = f"""Company name: {company_name}

CRAWLED WEBSITE CONTENT:
{crawled_text if crawled_text else "(no content could be crawled)"}

SEARCH ENGINE SNIPPETS:
{chr(10).join(search_snippets) if search_snippets else "(none)"}

CANDIDATE COMPETITORS FOUND VIA SEARCH (verify/replace with better ones if you know them):
{json.dumps(competitor_candidates, indent=2) if competitor_candidates else "(none found)"}

Produce the JSON analysis now."""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # OpenRouter attribution headers (optional but recommended)
            "HTTP-Referer": "https://relu-company-research.app",
            "X-Title": "Relu Company Research Assistant",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"].strip()
        content = content.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Fallback: return raw text as summary if the model didn't obey JSON formatting
            return {
                "company_name": company_name,
                "summary": content,
                "products_services": [],
                "pain_points": [],
                "address": None,
                "competitor_suggestions": competitor_candidates[:5],
            }
