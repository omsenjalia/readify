"""Tests for block -> row mapping and document persistence."""

import pytest

from services.documents import (
    block_words,
    blocks_to_rows,
    count_words,
    persist_document,
)
from tests.fakes import FakeSupabase


class TestBlockWords:
    def test_text_block_with_pretokenised_words(self):
        assert block_words({"type": "text", "words": ["a", "b"]}) == ["a", "b"]

    def test_text_block_falls_back_to_tokenising(self):
        assert block_words({"type": "text", "text": "a b"}) == ["a", "b"]

    def test_prefers_words_over_text(self):
        block = {"type": "text", "words": ["kept"], "text": "ignored"}
        assert block_words(block) == ["kept"]

    def test_paragraph_block_is_tokenised(self):
        assert block_words({"type": "paragraph", "text": "hello world"}) == [
            "hello",
            "world",
        ]

    def test_empty_words_list_means_no_words(self):
        # `words: []` is an explicit "this block is empty" signal — the PDF
        # extractor uses it to drop text blocks whose content moved elsewhere.
        # It must NOT fall back to `text`, or those blocks would reappear.
        block = {"type": "text", "words": [], "text": "fallback"}
        assert block_words(block) == []

    def test_image_block_has_no_words(self):
        assert block_words({"type": "image", "image_url": "x.png"}) == []

    def test_unknown_block_type(self):
        assert block_words({"type": "wat"}) == []

    def test_missing_fields_do_not_raise(self):
        assert block_words({}) == []
        assert block_words({"type": "text"}) == []
        assert block_words({"type": "paragraph"}) == []


class TestCountWords:
    def test_sums_across_mixed_blocks(self):
        blocks = [
            {"type": "text", "words": ["a", "b"]},
            {"type": "image", "image_url": "x.png"},
            {"type": "paragraph", "text": "c d e"},
        ]
        assert count_words(blocks) == 5

    def test_empty(self):
        assert count_words([]) == 0


class TestBlocksToRows:
    def test_positions_are_sequential(self):
        blocks = [
            {"type": "text", "words": ["a"]},
            {"type": "image", "image_url": "x.png"},
            {"type": "text", "words": ["b"]},
        ]
        rows = blocks_to_rows("doc", blocks)
        assert [r["position"] for r in rows] == [0, 1, 2]

    def test_image_row_uses_image_url(self):
        rows = blocks_to_rows("doc", [{"type": "image", "image_url": "p.png"}])
        assert rows[0]["type"] == "image"
        assert rows[0]["image_url"] == "p.png"
        assert rows[0]["needs_ocr"] is False

    def test_image_row_accepts_legacy_url_key(self):
        rows = blocks_to_rows("doc", [{"type": "image", "url": "legacy.png"}])
        assert rows[0]["image_url"] == "legacy.png"

    def test_scanned_page_keeps_needs_ocr(self):
        rows = blocks_to_rows("doc", [{"type": "image", "image_url": "p.png", "needs_ocr": True}])
        assert rows[0]["needs_ocr"] is True

    def test_text_rows_never_need_ocr(self):
        rows = blocks_to_rows("doc", [{"type": "text", "words": ["a"], "needs_ocr": True}])
        assert rows[0]["needs_ocr"] is False

    def test_all_rows_carry_document_id(self):
        rows = blocks_to_rows("doc-1", [{"type": "text", "words": ["a"]}])
        assert rows[0]["document_id"] == "doc-1"

    def test_omitting_needs_ocr_drops_the_column(self):
        rows = blocks_to_rows(
            "doc",
            [{"type": "image", "image_url": "p.png"}],
            include_needs_ocr=False,
        )
        assert "needs_ocr" not in rows[0]

    def test_text_row_carries_editor_html(self):
        rows = blocks_to_rows(
            "doc",
            [{"type": "text", "text": "hi", "html": "<p>hi</p>"}],
        )
        assert rows[0]["html"] == "<p>hi</p>"
        assert rows[0]["words"] == ["hi"]

    def test_omitting_html_drops_the_column(self):
        rows = blocks_to_rows(
            "doc",
            [{"type": "text", "text": "hi", "html": "<p>hi</p>"}],
            include_html=False,
        )
        assert "html" not in rows[0]

    def test_blocks_without_html_omit_the_key(self):
        rows = blocks_to_rows("doc", [{"type": "text", "words": ["a"]}])
        assert "html" not in rows[0]


def persist(sb: FakeSupabase, **overrides):
    """Call persist_document with sensible defaults."""
    kwargs = {
        "document_id": "doc",
        "slug": "slug",
        "title": "Title",
        "source_type": "pdf",
        "blocks": [{"type": "text", "words": ["a"]}],
    }
    kwargs.update(overrides)
    return persist_document(sb, **kwargs)


class TestPersistDocument:
    def test_returns_word_count(self):
        sb = FakeSupabase()
        assert persist(sb, blocks=[{"type": "text", "words": ["a", "b", "c"]}]) == 3

    def test_writes_blocks_before_marking_ready(self):
        sb = FakeSupabase()
        persist(sb)

        block_insert = next(
            i for i, op in enumerate(sb.ops) if op.name == "insert" and op.table == "content_blocks"
        )
        ready_update = next(
            i
            for i, op in enumerate(sb.ops)
            if op.name == "update"
            and op.table == "documents"
            and op.payload.get("status") == "ready"
        )
        assert block_insert < ready_update, "status flipped before blocks landed"

    def test_clears_previous_blocks(self):
        sb = FakeSupabase()
        persist(sb)
        assert sb.ops_named("delete")[0].table == "content_blocks"

    def test_sets_error_and_progress_to_none(self):
        sb = FakeSupabase()
        persist(sb)
        ready = next(op for op in sb.ops_named("update") if op.payload.get("status") == "ready")
        assert ready.payload["error_msg"] is None
        assert ready.payload["progress_msg"] is None

    def test_falls_back_to_insert_when_row_is_missing(self):
        sb = FakeSupabase(document_exists=False)
        persist(sb)
        inserted = next(op for op in sb.ops_named("insert") if op.table == "documents")
        assert inserted.payload["id"] == "doc"
        assert inserted.payload["slug"] == "slug"
        assert inserted.payload["visibility"] == "private"
        assert inserted.payload["is_favorite"] is False

    def test_empty_title_becomes_placeholder(self):
        sb = FakeSupabase()
        persist(sb, title="")
        ready = next(op for op in sb.ops_named("update") if op.payload.get("status") == "ready")
        assert ready.payload["title"] == "Untitled document"

    def test_never_touches_user_owned_fields(self):
        sb = FakeSupabase()
        persist(sb)
        for op in sb.ops_named("update"):
            assert "visibility" not in op.payload
            assert "is_favorite" not in op.payload

    def test_retries_without_html_when_column_is_missing(self):
        sb = FakeSupabase(missing_columns={"html"})
        persist(sb, blocks=[{"type": "text", "text": "a", "html": "<p>a</p>"}])

        inserts = [op for op in sb.ops_named("insert") if op.table == "content_blocks"]
        assert len(inserts) == 2, "expected one failed insert and one retry"
        assert "html" in inserts[0].payload[0]
        assert "html" not in inserts[1].payload[0]
        assert "needs_ocr" in inserts[1].payload[0]

    def test_retries_down_to_oldest_schema_when_both_columns_missing(self):
        sb = FakeSupabase(missing_columns={"needs_ocr", "html"})
        persist(
            sb,
            blocks=[
                {
                    "type": "text",
                    "text": "a",
                    "html": "<p>a</p>",
                }
            ],
        )

        inserts = [op for op in sb.ops_named("insert") if op.table == "content_blocks"]
        assert len(inserts) == 3, "full -> without html -> without needs_ocr"
        assert "html" in inserts[0].payload[0]
        assert "needs_ocr" in inserts[0].payload[0]
        assert "html" not in inserts[1].payload[0]
        assert "needs_ocr" in inserts[1].payload[0]
        assert "html" not in inserts[2].payload[0]
        assert "needs_ocr" not in inserts[2].payload[0]

    def test_success_on_first_try_when_schema_is_current(self):
        sb = FakeSupabase()
        persist(sb, blocks=[{"type": "text", "text": "a", "html": "<p>a</p>"}])
        inserts = [op for op in sb.ops_named("insert") if op.table == "content_blocks"]
        assert len(inserts) == 1
        assert inserts[0].payload[0]["html"] == "<p>a</p>"

    def test_skips_block_insert_when_there_are_no_blocks(self):
        sb = FakeSupabase()
        persist(sb, blocks=[])
        assert not [op for op in sb.ops_named("insert") if op.table == "content_blocks"]


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-v"]))
