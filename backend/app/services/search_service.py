"""
Serper.dev integration.

Used to:
  - Resolve a company name -> official website
  - Gather general company info (phone/address snippets) from search results
  - Find likely competitors operating in the same industry
"""

import re
import httpx
from app.config import settings


class SerperService:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.SERPER_API_KEY
        if not self.api_key:
            raise ValueError("Serper.dev API key is missing")

    async def _search(self, query: str, num: int = 10) -> dict:
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        payload = {"q": query, "num": num}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.SERPER_BASE_URL}/search", json=payload, headers=headers
            )
            resp.raise_for_status()
            return resp.json()

    async def find_official_website(self, company_name: str) -> str | None:
        """Best-effort resolution of a company name to its official domain."""
        data = await self._search(f"{company_name} official website")
        organic = data.get("organic", [])

        # Skip common aggregator/social domains that aren't the company's own site
        blocked_domains = (
            "linkedin.com", "wikipedia.org", "facebook.com", "twitter.com",
            "x.com", "instagram.com", "crunchbase.com", "glassdoor.com",
            "youtube.com", "indeed.com", "bloomberg.com",
        )
        for result in organic:
            link = result.get("link", "")
            if link and not any(b in link for b in blocked_domains):
                return link
        return organic[0].get("link") if organic else None

    async def gather_company_snippets(self, company_name: str) -> list[str]:
        """Collect search-result snippets that may contain phone/address/info."""
        data = await self._search(f"{company_name} contact address phone")
        snippets = []
        for result in data.get("organic", [])[:5]:
            if result.get("snippet"):
                snippets.append(result["snippet"])
        return snippets

    async def find_competitors(
        self, company_name: str, industry_hint: str = ""
    ) -> list[dict]:
        """Search for likely competitors; returns [{name, website}, ...] candidates.

        This is a supplementary signal — the AI model does the actual
        judgment call on which of these (plus its own knowledge) are true
        competitors, per the 'Competitor Analysis' requirement.
        """
        query = f"{company_name} competitors alternatives"
        if industry_hint:
            query = f"{company_name} {industry_hint} competitors alternatives"

        data = await self._search(query)
        candidates = []
        seen_domains = set()

        for result in data.get("organic", [])[:8]:
            link = result.get("link", "")
            title = result.get("title", "")
            domain_match = re.search(r"https?://(?:www\.)?([^/]+)", link)
            domain = domain_match.group(1) if domain_match else None

            if domain and domain not in seen_domains and company_name.lower() not in domain.lower():
                seen_domains.add(domain)
                candidates.append({"name": title.split(" - ")[0].split(" | ")[0], "website": link})

        return candidates
