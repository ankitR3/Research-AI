from typing import Optional
from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    query: str = Field(..., description="Company name OR website URL")

    # Optional per-request credential overrides (from the sidebar UI)
    openrouter_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    ai_model: Optional[str] = Field(
        default=None, description="Any model id supported by OpenRouter"
    )


class Competitor(BaseModel):
    name: str
    website: Optional[str] = None


class CompanyReport(BaseModel):
    company_name: str
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    products_services: list[str] = []
    pain_points: list[str] = []
    competitors: list[Competitor] = []
    summary: Optional[str] = None
    pages_crawled: list[str] = []


class ResearchResponse(BaseModel):
    report: CompanyReport
    report_id: str


class DiscordConfigRequest(BaseModel):
    bot_token: str
    channel_id: str
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None


class DiscordSendRequest(BaseModel):
    bot_token: Optional[str] = None
    channel_id: Optional[str] = None
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    company_name: str
    company_website: Optional[str] = None
    report_id: str
