import logging
import os
import re
import secrets
import threading
import uuid
from datetime import UTC, datetime

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
)

from db import get_supabase
from models import ProcessingStatus, ProcessRequest, ProcessResponse
from services import docx_service, text_service, youtube_service
from services import pdf as pdf_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory job store. Replace with Redis/Postgres when scaling horizontally.
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _secret_dep(
    authorization: str | None = Header(default=None),
    x_processor_secret: str | None = Header(default=None),
) -> None:
    """Reject requests that don't carry the shared processor secret.

    Accepted as ``Authorization: Bearer <secret>``, with the legacy
    ``X-Processor-Secret`` header still honoured during the web-app rollout.
    """
    expected = os.environ.get("PROCESSOR_SECRET")
    if not expected or expected == "change-me-in-production":
        return
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_processor_secret:
        token = x_processor_secret
    if token != expected:
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


def _download_storage_file(storage_path: str) -> bytes:
    """Pull a source file out of the private `documents` bucket."""
    return get_supabase().storage.from_("documents").download(storage_path)


def _update_document(document_id: str, **fields) -> None:
    get_supabase().table("documents").update(fields).eq(
        "id", document_id
    ).execute()


def _extract_blocks(
    source_type: str,
    document_id: str,
    storage_path: str | None,
    youtube_url: str | None,
    raw_text: str | None,
) -> list[dict]:
    if source_type in {"text", "txt"}:
        if not raw_text:
            raise ValueError("source_type 'txt' requires raw_text")
        return text_service.extract_text(raw_text)

    if source_type == "youtube":
        if not youtube_url:
            raise ValueError("source_type 'youtube' requires a youtube_url")
        return youtube_service.extract_youtube_transcript(youtube_url)

    if source_type == "image":
        raise NotImplementedError("image OCR pipeline not implemented yet")

    if not storage_path:
        raise ValueError(f"source_type '{source_type}' requires a storage_path")

    file_bytes = _download_storage_file(storage_path)

    if source_type == "pdf":
        return pdf_service.extract_pdf_blocks(file_bytes, document_id)
    if source_type == "docx":
        return docx_service.extract_docx_bytes(file_bytes)

    raise ValueError(f"unsupported source_type: {source_type}")


def _block_words(block: dict) -> list[str]:
    if block.get("type") == "text":
        words = block.get("words")
        if words is None and block.get("text"):
            words = block["text"].split()
        return words or []
    if block.get("type") == "paragraph":
        return (block.get("text") or "").split()
    return []


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
    its existing blocks so re-runs stay idempotent. The web app already
    created the row (and its slug), so the slug is preserved on update.
    """
    supabase = get_supabase()
    word_count = sum(len(_block_words(b)) for b in blocks)
    now = datetime.now(UTC).isoformat()

    fields = {
        "title": title or "Untitled document",
        "source_type": source_type,
        "status": "ready",
        "visibility": "private",
        "word_count": word_count,
        "is_favorite": False,
        "error_msg": None,
        "updated_at": now,
    }
    existing = (
        supabase.table("documents").select("id").eq("id", document_id).execute()
    )
    if existing.data:
        fields.pop("slug", None)
        supabase.table("documents").update(fields).eq("id", document_id).execute()
    else:
        supabase.table("documents").insert(
            {"id": document_id, "slug": slug, **fields}
        ).execute()

    rows = [
        {
            "document_id": document_id,
            "position": position,
            "type": "image",
            "image_url": block.get("image_url") or block.get("url"),
            "needs_ocr": bool(block.get("needs_ocr")),
        }
        if block.get("type") == "image"
        else {
            "document_id": document_id,
            "position": position,
            "type": "text",
            "words": _block_words(block),
            "needs_ocr": False,
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
    storage_path: str | None,
    youtube_url: str | None,
    raw_text: str | None,
) -> None:
    _set_status(job_id, "processing")
    try:
        progress = (
            "Extracting YouTube transcript…"
            if source_type == "youtube"
            else "Extracting text…"
        )
        _update_document(
            document_id, status="processing", progress_msg=progress, error_msg=None
        )

        blocks = _extract_blocks(
            source_type, document_id, storage_path, youtube_url, raw_text
        )

        existing_slug = (
            get_supabase()
            .table("documents")
            .select("slug")
            .eq("id", document_id)
            .execute()
            .data
        )
        slug = existing_slug[0]["slug"] if existing_slug else _slugify(title)

        word_count = _persist_document(
            document_id, slug, title, source_type, blocks
        )
        _update_document(
            document_id,
            status="ready",
            word_count=word_count,
            progress_msg=None,
            error_msg=None,
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
        try:
            _update_document(
                document_id, status="error", error_msg=str(exc), progress_msg=None
            )
        except Exception:
            logger.exception("failed to persist error state for %s", document_id)
        _set_status(job_id, "failed", error=str(exc))


@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=202,
    dependencies=[Depends(_secret_dep)],
)
async def process(
    body: ProcessRequest,
    background_tasks: BackgroundTasks,
) -> ProcessResponse:
    job_id = uuid.uuid4().hex
    _set_status(job_id, "pending", document_id=body.document_id)

    background_tasks.add_task(
        _run_job,
        job_id=job_id,
        source_type=body.source_type,
        document_id=body.document_id,
        title=body.title or "",
        storage_path=body.storage_path,
        youtube_url=body.youtube_url,
        raw_text=body.raw_text,
    )
    return ProcessResponse(
        job_id=job_id, status="accepted", message="Document queued for processing"
    )


@router.get("/status/{job_id}", response_model=ProcessingStatus)
async def status(job_id: str) -> ProcessingStatus:
    job = _get_status(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")
    return ProcessingStatus(job_id=job_id, **job)