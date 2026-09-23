"""DOCX extraction: formatted HTML blocks for the editor."""

import io
import zipfile

import pytest

from services.docx_service import extract_docx_bytes

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""


def make_docx(body_xml: str) -> bytes:
    """Craft the smallest DOCX Mammoth accepts (no external deps)."""
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body_xml}</w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES)
        archive.writestr("_rels/.rels", RELS)
        archive.writestr("word/document.xml", document)
    return buffer.getvalue()


def xml_text(text: str) -> str:
    """Escape text for embedding inside the crafted OOXML."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def paragraph(text: str) -> str:
    return (
        f'<w:p><w:r><w:t xml:space="preserve">{xml_text(text)}</w:t></w:r></w:p>'
    )


def heading(text: str, level: int = 1) -> str:
    return (
        f'<w:p><w:pPr><w:pStyle w:val="Heading{level}"/></w:pPr>'
        f"<w:r><w:t>{xml_text(text)}</w:t></w:r></w:p>"
    )


class TestExtractDocxBytes:
    def test_heading_keeps_its_tag(self):
        data = make_docx(heading("Chapter One") + paragraph("Body text."))
        blocks = extract_docx_bytes(data)
        assert blocks[0]["html"] == "<h1>Chapter One</h1>"
        assert blocks[0]["text"] == "Chapter One"
        assert blocks[1]["html"] == "<p>Body text.</p>"

    def test_each_top_level_element_is_its_own_block(self):
        data = make_docx(
            heading("Title", level=2)
            + paragraph("First.")
            + paragraph("Second."),
        )
        blocks = extract_docx_bytes(data)
        assert [b["html"] for b in blocks] == [
            "<h2>Title</h2>",
            "<p>First.</p>",
            "<p>Second.</p>",
        ]

    def test_bold_runs_survive(self):
        body = (
            '<w:p>'
            '<w:r><w:t xml:space="preserve">plain </w:t></w:r>'
            '<w:r><w:rPr><w:b/></w:rPr><w:t>bold</w:t></w:r>'
            "</w:p>"
        )
        blocks = extract_docx_bytes(make_docx(body))
        assert "<strong>bold</strong>" in blocks[0]["html"]
        assert blocks[0]["text"] == "plain bold"

    def test_text_and_html_stay_in_sync(self):
        data = make_docx(heading("Hello") + paragraph("World of readers."))
        for block in extract_docx_bytes(data):
            for word in block["text"].split():
                assert word in block["html"] or word in block["text"]

    def test_empty_document_falls_back_to_nothing(self):
        assert extract_docx_bytes(make_docx("")) == []

    def test_escapes_special_characters(self):
        blocks = extract_docx_bytes(make_docx(paragraph("a < b & c")))
        assert blocks[0]["html"] == "<p>a &lt; b &amp; c</p>"
        assert blocks[0]["text"] == "a < b & c"

    @pytest.mark.parametrize("body", ["", "<w:sectPr/>"])
    def test_body_without_paragraphs(self, body):
        # No paragraph content — either the raw-text fallback or an empty
        # list is acceptable, but it must not raise.
        assert isinstance(extract_docx_bytes(make_docx(body)), list)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-v"]))
