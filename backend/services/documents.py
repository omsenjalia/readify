"""Turning extracted blocks into `content_blocks` rows.

The block -> row mapping is kept pure and separate from the database calls so
it can be tested directly; the I/O half takes an injected Supabase client.
"""

import logging
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from services.text_service import tokenize_words

logger = logging.getLogger(__name__)

#: A text block carries either pre-tokenised ``words`` or raw ``text``.
Block = dict[str, Any]

# --------------------------------------------------------------------------
# Pure helpers
# --------------------------------------------------------------------------


def block_words(block: Block) -> list[str]:
    """Words for a single block, tokenising on demand.

    The PDF/DOCX extractors emit ``{"type": "text", "words": [...]}`` while the
    plain-text extractor emits ``{"type": "paragraph", "text": "..."}``. Both
    are normalised here.
    """
    if block.get("type") == "text":
        words = block.get("words")
        if words is None and block.get("text"):
            words = tokenize_words(block["text"])
        return list(words or [])

    if block.get("type") == "paragraph":
        return tokenize_words(block.get("text") or "")

    return []


def count_words(blocks: Iterable[Block]) -> int:
    """Total readable words across every block."""
    return sum(len(block_words(block)) for block in blocks)


def blocks_to_rows(
    document_id: str,
    blocks: Iterable[Block],
    *,
    include_needs_ocr: bool = True,
    include_html: bool = True,
) -> list[dict[str, Any]]:
    """Flatten blocks into `content_blocks` insert rows.

    `include_needs_ocr` / `include_html` exist because a partially-migrated
    database may not have those columns yet; the caller retries with fewer
    columns until the insert lands (oldest schema last).
    """
    rows: list[dict[str, Any]] = []

    for position, block in enumerate(blocks):
        is_image = block.get("type") == "image"

        row: dict[str, Any] = {
            "document_id": document_id,
            "position": position,
            "type": "image" if is_image else "text",
        }

        if is_image:
            row["image_url"] = block.get("image_url") or block.get("url")
        else:
            row["words"] = block_words(block)
            html = block.get("html")
            if include_html and html:
                row["html"] = html

        if include_needs_ocr:
            row["needs_ocr"] = bool(block.get("needs_ocr")) if is_image else False

        rows.append(row)

    return rows


# --------------------------------------------------------------------------
# Database writes
# --------------------------------------------------------------------------


def persist_document(
    supabase: Any,
    *,
    document_id: str,
    slug: str,
    title: str,
    source_type: str,
    blocks: list[Block],
) -> int:
    """Replace a document's content blocks and mark it ready.

    Order matters: blocks are written *first*, and only then is the status
    flipped to ``ready``. Earlier builds set ``status = ready`` before the
    insert, so a failed insert left a row with a word count and an error state.
    User-owned fields (``visibility``, ``is_favorite``) are never touched.

    Returns the number of words written.
    """
    word_count = count_words(blocks)

    supabase.table("content_blocks").delete().eq("document_id", document_id).execute()

    rows = blocks_to_rows(document_id, blocks)
    if rows:
        try:
            supabase.table("content_blocks").insert(rows).execute()
        except Exception as exc:  # noqa: BLE001 - retry paths for old schemas
            # Columns were added over time (`needs_ocr` first, `html` later);
            # drop the newest missing column first and keep descending.
            logger.warning(
                "content_blocks insert with html failed (%s); retrying without html",
                exc,
            )
            rows = blocks_to_rows(document_id, blocks, include_html=False)
            try:
                if rows:
                    supabase.table("content_blocks").insert(rows).execute()
            except Exception as exc2:  # noqa: BLE001
                logger.warning(
                    "content_blocks insert without html failed (%s); "
                    "retrying without needs_ocr",
                    exc2,
                )
                rows = blocks_to_rows(
                    document_id,
                    blocks,
                    include_html=False,
                    include_needs_ocr=False,
                )
                if rows:
                    supabase.table("content_blocks").insert(rows).execute()

    fields = {
        "title": title or "Untitled document",
        "source_type": source_type,
        "status": "ready",
        "word_count": word_count,
        "error_msg": None,
        "progress_msg": None,
        "updated_at": datetime.now(UTC).isoformat(),
    }

    existing = supabase.table("documents").select("id").eq("id", document_id).execute()
    if existing.data:
        supabase.table("documents").update(fields).eq("id", document_id).execute()
    else:
        supabase.table("documents").insert(
            {
                "id": document_id,
                "slug": slug,
                "visibility": "private",
                "is_favorite": False,
                **fields,
            }
        ).execute()

    return word_count


def update_document(supabase: Any, document_id: str, **fields: Any) -> None:
    """Patch fields on a document row."""
    supabase.table("documents").update(fields).eq("id", document_id).execute()


def get_slug(supabase: Any, document_id: str) -> str | None:
    """Return the document's existing slug, if it already has a usable one.

    `.get()` rather than `["slug"]`: the column is nullable, and depending on
    how the response is projected a NULL may arrive as a missing key. Either
    way this must return ``None`` so the caller generates a fresh slug instead
    of raising inside the background job.
    """
    rows = supabase.table("documents").select("slug").eq("id", document_id).execute().data
    return (rows[0].get("slug") if rows else None) or None
