"""Document processing API.

The router is deliberately thin: it authenticates, enqueues, and reports. The
job store lives in `jobs.py`, the block->row mapping and persistence in
`services/documents.py`, and extraction in `services/*`.
"""

import logging
import re
import secrets
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from db import get_supabase
from jobs import JobStore
from models import ProcessingStatus, ProcessRequest, ProcessResponse
from security import require_processor_secret
from services import documents as documents_service
from services import docx_service, text_service, youtube_service
from services import pdf as pdf_service

logger = logging.getLogger(__name__)

router = APIRouter()

#: Per-process job registry. See the warning in `jobs.JobStore`.
_jobs = JobStore()


def _slugify(title: str) -> str:
    """Readable slug plus a random suffix, so slugs are unguessable."""
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return f"{slug or 'document'}-{secrets.token_urlsafe(6)}"


def _download_storage_file(storage_path: str) -> bytes:
    """Pull a source file out of the private `documents` bucket."""
    return get_supabase().storage.from_("documents").download(storage_path)


async def _extract_blocks(
    body: ProcessRequest,
    document_id: str,
) -> list[dict]:
    """Dispatch to the right extractor for the request's source type.

    Validation already guarantees the required field is present (see
    `models.ProcessRequest`), so the branches here read as pure dispatch.
    """
    source_type = body.source_type

    if source_type in {"text", "txt"}:
        return text_service.extract_text(body.raw_text or "")

    if source_type == "youtube":
        return youtube_service.extract_youtube_transcript(body.youtube_url or "")

    if source_type == "image":
        raise NotImplementedError("image OCR pipeline not implemented yet")

    file_bytes = _download_storage_file(body.storage_path or "")

    if source_type == "pdf":

        async def report_progress(msg: str) -> None:
            documents_service.update_document(
                get_supabase(), document_id, progress_msg=msg
            )

        return await pdf_service.extract_pdf_blocks(
            file_bytes, document_id, progress_cb=report_progress
        )

    if source_type == "docx":
        return docx_service.extract_docx_bytes(file_bytes)

    raise ValueError(f"unsupported source_type: {source_type}")


async def _run_job(job_id: str, body: ProcessRequest) -> None:
    """Extract, persist, and record the outcome. Never raises."""
    document_id = body.document_id
    supabase = get_supabase()
    _jobs.set(job_id, "processing")

    try:
        progress = (
            "Extracting YouTube transcript…"
            if body.source_type == "youtube"
            else "Extracting text…"
        )
        documents_service.update_document(
            supabase,
            document_id,
            status="processing",
            progress_msg=progress,
            error_msg=None,
        )

        blocks = await _extract_blocks(body, document_id)

        slug = documents_service.get_slug(supabase, document_id) or _slugify(
            body.title or ""
        )

        source_type = "text" if body.source_type == "txt" else body.source_type
        # `persist_document` owns the whole completion write: content blocks,
        # word_count, and the flip to `ready` (in that order). Repeating the
        # status update here would be a second, redundant round-trip.
        word_count = documents_service.persist_document(
            supabase,
            document_id=document_id,
            slug=slug,
            title=body.title or "",
            source_type=source_type,
            blocks=blocks,
        )

        _jobs.set(
            job_id,
            "completed",
            document_id=document_id,
            slug=slug,
            word_count=word_count,
        )
    except Exception as exc:  # noqa: BLE001 - a failed job must not kill the task
        logger.exception("job %s failed", job_id)
        try:
            documents_service.update_document(
                supabase,
                document_id,
                status="error",
                error_msg=str(exc),
                progress_msg=None,
            )
        except Exception:  # noqa: BLE001
            logger.exception("failed to persist error state for %s", document_id)
        _jobs.set(job_id, "failed", error=str(exc))


@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=202,
    dependencies=[Depends(require_processor_secret)],
)
async def process(
    body: ProcessRequest,
    background_tasks: BackgroundTasks,
) -> ProcessResponse:
    """Queue a document for extraction and return a job id immediately."""
    job_id = uuid.uuid4().hex
    _jobs.set(job_id, "pending", document_id=body.document_id)

    background_tasks.add_task(_run_job, job_id, body)

    return ProcessResponse(
        job_id=job_id,
        status="accepted",
        message="Document queued for processing",
    )


@router.get(
    "/status/{job_id}",
    response_model=ProcessingStatus,
    dependencies=[Depends(require_processor_secret)],
)
async def status(job_id: str) -> ProcessingStatus:
    """Report a queued job's progress."""
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id")
    return ProcessingStatus(job_id=job_id, **job)
