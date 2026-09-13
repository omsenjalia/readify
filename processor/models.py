from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["pdf", "docx", "youtube", "text", "image"]


class ProcessRequest(BaseModel):
    source_type: SourceType
    document_id: str | None = None
    title: str | None = None
    url: str | None = None
    text: str | None = None


class ProcessResponse(BaseModel):
    job_id: str
    status: str
    message: str = ""


class ProcessingStatus(BaseModel):
    job_id: str
    status: str
    error: str | None = None
    document_id: str | None = None
    slug: str | None = None
    word_count: int | None = None


class HealthResponse(BaseModel):
    status: str
    supabase: str = Field(default="ok")