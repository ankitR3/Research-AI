"""
Website crawler.

Discovers and extracts meaningful text content from a company's important
pages (home, about, products, services, solutions, contact, pricing) while
skipping duplicates, login pages, and irrelevant links.
"""

import re
import httpx
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from app.config import settings

PRIORITY_KEYWORDS = [
    "about", "product", "service", "solution", "contact", "pricing", "plans",
]

IGNORE_KEYWORDS = [
    "login", "signin", "sign-in", "register", "signup", "sign-up",
    "privacy", "terms", "cookie", "careers", "jobs", "blog/",
    "wp-admin", "cart", "checkout", ".pdf", ".jpg", ".png", ".zip",
    "javascript:", "mailto:", "tel:",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


class CrawlerService:
    def __init__(self, max_pages: int | None = None, timeout: int | None = None):
        self.max_pages = max_pages or settings.CRAWLER_MAX_PAGES
        self.timeout = timeout or settings.CRAWLER_TIMEOUT_SECONDS

    @staticmethod
    def _normalize_url(url: str) -> str:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url.rstrip("/")

    def _same_domain(self, base: str, link: str) -> bool:
        return urlparse(base).netloc.replace("www.", "") == urlparse(link).netloc.replace("www.", "")

    def _score_link(self, url: str) -> int:
        """Higher score = higher crawl priority."""
        lower = url.lower()
        for i, kw in enumerate(PRIORITY_KEYWORDS):
            if kw in lower:
                return len(PRIORITY_KEYWORDS) - i
        return 0

    async def _fetch(self, client: httpx.AsyncClient, url: str) -> httpx.Response | None:
        try:
            resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=self.timeout)
            if resp.status_code == 200 and "text/html" in resp.headers.get("content-type", ""):
                return resp
        except (httpx.HTTPError, httpx.TimeoutException):
            return None
        return None

    def _extract_links(self, base_url: str, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if any(kw in href.lower() for kw in IGNORE_KEYWORDS):
                continue
            full_url = urljoin(base_url, href).split("#")[0].rstrip("/")
            if self._same_domain(base_url, full_url):
                links.add(full_url)
        return list(links)

    def _extract_text(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "noscript", "svg"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        return text[:4000]  # cap per-page content to keep AI payload manageable

    def _extract_contact_hints(self, html: str) -> dict:
        text = BeautifulSoup(html, "html.parser").get_text(" ")
        phone_match = re.search(r"(\+?\d[\d\-\s().]{7,}\d)", text)
        return {"phone": phone_match.group(1).strip() if phone_match else None}

    async def crawl(self, start_url: str) -> dict:
        start_url = self._normalize_url(start_url)
        visited: set[str] = set()
        to_visit: list[str] = [start_url]
        pages: dict[str, str] = {}
        contact_hints = {"phone": None}

        async with httpx.AsyncClient() as client:
            while to_visit and len(visited) < self.max_pages:
                # Prioritize important pages first
                to_visit.sort(key=self._score_link, reverse=True)
                url = to_visit.pop(0)

                if url in visited:
                    continue
                visited.add(url)

                resp = await self._fetch(client, url)
                if not resp:
                    continue

                html = resp.text
                pages[url] = self._extract_text(html)

                if not contact_hints["phone"]:
                    hints = self._extract_contact_hints(html)
                    if hints["phone"]:
                        contact_hints["phone"] = hints["phone"]

                if url == start_url:
                    new_links = self._extract_links(start_url, html)
                    for link in new_links:
                        if link not in visited and link not in to_visit:
                            to_visit.append(link)

        return {
            "start_url": start_url,
            "pages": pages,  # {url: extracted_text}
            "pages_crawled": list(pages.keys()),
            "contact_hints": contact_hints,
        }
