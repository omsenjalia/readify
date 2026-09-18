"""Request/response schemas for the processor API."""

from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

SourceType = Literal["pdf", "docx", "youtube", "txt", "text", "image"]

#: Source types that must carry a `storage_path`.
FILE_SOURCE_TYPES = frozenset({"pdf", "docx"})
#: Source types that must carry `raw_text`.
TEXT_SOURCE_TYPES = frozenset({"txt", "text"})


class ProcessRequest(BaseModel):
    """Payload for ``POST /api/process``.

    Exactly one of ``storage_path`` (file), ``youtube_url`` (video) or
    ``raw_text`` (pasted text) describes the source; which one is required
    depends on ``source_type``.
    """

    document_id: str = Field(min_length=1)
    source_type: SourceType
    title: str | None = None
    storage_path: str | None = None
    youtube_url: str | None = None
    raw_text: str | None = None

    @model_validator(mode="after")
    def _check_source_field(self) -> Self:
        """Fail fast with a 422 instead of a failed background job.

        Previously this was discovered inside the background task, so the
        caller got a 202 and the document silently ended up in `error`.
        """
        if self.source_type in FILE_SOURCE_TYPES and not self.storage_path:
            raise ValueError(
                f"source_type '{self.source_type}' requires a storage_path"
            )
        if self.source_type == "youtube" and not self.youtube_url:
            raise ValueError("source_type 'youtube' requires a youtube_url")
        if self.source_type in TEXT_SOURCE_TYPES and not (self.raw_text or "").strip():
            raise ValueError(f"source_type '{self.source_type}' requires raw_text")
        return self


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
