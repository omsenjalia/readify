import logging
import os
import re
import secrets
import tempfile
import threading
import uuid
from datetime import UTC, datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)

from db import get_supabase
from models import ProcessingStatus, ProcessResponse
from services import docx_service, text_service, youtube_service
from services import pdf as pdf_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory job store. Replace with Redis/Postgres when scaling horizontally.
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _secret_dep(
    x_processor_secret: str | None = Header(default=None),
) -> None:
    """Reject requests that don't carry the shared processor secret."""
    expected = os.environ.get("PROCESSOR_SECRET")
    if not expected or expected == "change-me-in-production":
        return
    if x_processor_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid processor secret")


def _set_status(job_id: str, status: str, **extra) -> None:
    with _jobs_lock:
        _jobs[job_id] = {"status": status, **extra}


def _get_status(job_id: str) -> dict | None:
    with _jobs_lock:
        return _jobs.get(job_id)


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    if not slug:
        slug = "document"
    return f"{slug}-{secrets.token_urlsafe(6)}"


def _save_temp(name: str, content: bytes) -> str:
    fd, path = tempfile.mkstemp(suffix=os.path.splitext(name)[1])
    with os.fdopen(fd, "wb") as f:
        f.write(content)
    return path


def _extract_blocks(
    source_type: str,
    content: bytes | None,
    filename: str | None,
    url: str | None,
    text: str | None,
) -> list[dict]:
    if source_type == "text":
        if not text:
            raise ValueError("source_type 'text' requires a text body")
        return text_service.extract_text(text)

    if source_type == "youtube":
        if not url:
            raise ValueError("source_type 'youtube' requires a url")
        return youtube_service.extract_youtube_transcript(url)

    if source_type == "image":
        raise NotImplementedError("image OCR pipeline not implemented yet")

    if content is None or not filename:
        raise ValueError(f"source_type '{source_type}' requires a file upload")

    path = _save_temp(filename, content)
    try:
        if source_type == "pdf":
            return pdf_service.extract_pdf(path)
        if source_type == "docx":
            return docx_service.extract_docx(path)
    finally:
        os.unlink(path)

    raise ValueError(f"unsupported source_type: {source_type}")


def _persist_document(
    document_id: str,
    slug: str,
    title: str,
    source_type: str,
    blocks: list[dict],
) -> int:
    """Write a processed document + its content blocks to Supabase.

    Documents land in ``public.documents``; each block becomes a row in
    ``public.content_blocks`` (type 'text' stores tokenized words, type
    'image' stores a public image_url). Reprocessing a document replaces
    its existing blocks so re-runs stay idempotent.
    """
    supabase = get_supabase()
    word_count = sum(len(b["text"].split()) for b in blocks)
    now = datetime.now(UTC).isoformat()

    supabase.table("documents").upsert(
        {
            "id": document_id,
            "slug": slug,
            "title": title or "Untitled document",
            "source_type": source_type,
            "status": "ready",
            "visibility": "private",
            "word_count": word_count,
            "is_favorite": False,
            "error_msg": None,
            "updated_at": now,
        }
    ).execute()

    rows = [
        {
            "document_id": document_id,
            "position": position,
            "type": "image",
            "image_url": block.get("url") or block.get("image_url"),
        }
        if block.get("type") == "image"
        else {
            "document_id": document_id,
            "position": position,
            "type": "text",
            "words": block.get("text", "").split(),
        }
        for position, block in enumerate(blocks)
    ]

    supabase.table("content_blocks").delete().eq(
        "document_id", document_id
    ).execute()
    if rows:
        supabase.table("content_blocks").insert(rows).execute()

    return word_count


def _run_job(
    job_id: str,
    source_type: str,
    document_id: str,
    title: str,
    url: str | None,
    text: str | None,
    content: bytes | None,
    filename: str | None,
) -> None:
    _set_status(job_id, "processing")
    try:
        blocks = _extract_blocks(source_type, content, filename, url, text)
        slug = _slugify(title)
        word_count = _persist_document(
            document_id, slug, title, source_type, blocks
        )
        _set_status(
            job_id,
            "completed",
            document_id=document_id,
            slug=slug,
            word_count=word_count,
        )
    except Exception as exc:
        logger.exception("job %s failed", job_id)
        _set_status(job_id, "failed", error=str(exc))


@router.post(
    "/process",
    response_model=ProcessResponse,
    dependencies=[Depends(_secret_dep)],
)
async def process(
    background_tasks: BackgroundTasks,
    source_type: str = Form(...),
    document_id: str | None = Form(None),
    title: str | None = Form(None),
    url: str | None = Form(None),
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
) -> ProcessResponse:
    if not document_id:
        document_id = uuid.uuid4().hex

    content = await file.read() if file else None
    job_id = uuid.uuid4().hex
    _set_status(job_id, "pending", document_id=document_id)

    background_tasks.add_task(
        _run_job,
        job_id=job_id,
        source_type=source_type,
        document_id=document_id,
        title=title or "",
        url=url,
        text=text,
        content=content,
        filename=file.filename if file else None,
    )
    return ProcessResponse(job_id=job_id, status="pending")


@router.get("/status/{job_id}", response_model=ProcessingStatus)
async def status(job_id: str) -> ProcessingStatus:
    job = _get_status(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")
    return ProcessingStatus(job_id=job_id, **job)