"""
Discord integration (bonus feature).

Uses the Discord Bot HTTP API directly (no discord.py dependency needed)
to post a message + attach the generated PDF to a configured channel.
"""

import json
import httpx
from app.config import settings


class DiscordService:
    def __init__(self, bot_token: str | None, channel_id: str | None):
        self.bot_token = bot_token or settings.DISCORD_BOT_TOKEN
        self.channel_id = channel_id or settings.DISCORD_CHANNEL_ID

        if not self.bot_token or not self.channel_id:
            raise ValueError(
                "Discord Bot Token and Channel ID must be saved in the sidebar or configured in the server .env first."
            )

    async def send_report(
        self,
        applicant_name: str | None,
        applicant_email: str | None,
        company_name: str,
        company_website: str | None,
        pdf_bytes: bytes,
        pdf_filename: str,
    ) -> dict:
        url = f"{settings.DISCORD_API_BASE}/channels/{self.channel_id}/messages"
        headers = {"Authorization": f"Bot {self.bot_token}"}

        content_lines = ["**New Company Research Report**"]
        if applicant_name:
            content_lines.append(f"Applicant: {applicant_name}")
        if applicant_email:
            content_lines.append(f"Email: {applicant_email}")
        content_lines.append(f"Company: {company_name}")
        if company_website:
            content_lines.append(f"Website: {company_website}")

        payload = {"content": "\n".join(content_lines)}

        files = {
            "payload_json": (None, json.dumps(payload)),
            "files[0]": (pdf_filename, pdf_bytes, "application/pdf"),
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, files=files)
            resp.raise_for_status()
            return resp.json()
