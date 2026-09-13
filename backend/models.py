from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["pdf", "docx", "youtube", "txt", "text", "image"]


class ProcessRequest(BaseModel):
    """Payload for POST /api/process.

    One of ``storage_path`` (file-based), ``youtube_url`` (youtube), or
    ``raw_text`` (txt/text) must describe the source.
    """

    document_id: str
    source_type: SourceType
    title: str | None = None
    storage_path: str | None = None
    youtube_url: str | None = None
    raw_text: str | None = None


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