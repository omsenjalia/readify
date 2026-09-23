"""Tests for the rich-text helpers shared with the editing canvas."""

import pytest

from services.richtext import (
    escape,
    html_to_text,
    pdf_dict_to_html,
    plain_text_to_html,
    split_top_level_html,
)


class TestEscape:
    def test_escapes_five_specials(self):
        assert escape('&<>"\'') == "&amp;&lt;&gt;&quot;&#39;"

    def test_plain_text_is_untouched(self):
        assert escape("hello world") == "hello world"


class TestPlainTextToHtml:
    def test_wraps_paragraphs(self):
        assert plain_text_to_html("a\n\nb") == "<p>a</p>\n<p>b</p>"

    def test_single_newlines_become_breaks(self):
        assert plain_text_to_html("one\ntwo") == "<p>one<br>\ntwo</p>"

    def test_escapes_markup(self):
        assert plain_text_to_html("<script>x</script>") == (
            "<p>&lt;script&gt;x&lt;/script&gt;</p>"
        )

    def test_empty_input(self):
        assert plain_text_to_html("  \n\n ") == ""

    def test_crlf_is_normalised(self):
        assert plain_text_to_html("a\r\n\r\nb") == "<p>a</p>\n<p>b</p>"


class TestHtmlToText:
    def test_joins_inline_content(self):
        assert html_to_text("<p>Hello <strong>world</strong></p>") == "Hello world"

    def test_separates_blocks(self):
        assert html_to_text("<p>one</p><p>two</p>") == "one\n\ntwo"

    def test_br_is_a_newline(self):
        assert html_to_text("<p>a<br>b</p>") == "a\nb"

    def test_drops_script_content(self):
        assert html_to_text("<p>a</p><script>var x = 1;</script>") == "a"

    def test_decodes_entities(self):
        assert html_to_text("<p>a &amp; b</p>") == "a & b"

    def test_handles_unbalanced_markup(self):
        # Must never raise — a failed save would lose the user's edits.
        assert isinstance(html_to_text("<p><strong>open"), str)


class TestSplitTopLevelHtml:
    def test_splits_siblings(self):
        assert split_top_level_html("<h1>a</h1><p>b</p>") == ["<h1>a</h1>", "<p>b</p>"]

    def test_keeps_nested_lists_whole(self):
        html = "<ul><li>a<ul><li>a1</li></ul></li></ul><p>next</p>"
        assert split_top_level_html(html) == [
            "<ul><li>a<ul><li>a1</li></ul></li></ul>",
            "<p>next</p>",
        ]

    def test_void_tags_are_self_contained(self):
        assert split_top_level_html("before<hr>after") == [
            "<p>before</p>",
            "<hr>",
            "<p>after</p>",
        ]
        assert split_top_level_html("<p>a<br>b</p>") == ["<p>a<br>b</p>"]

    def test_wraps_stray_text(self):
        assert split_top_level_html("bare") == ["<p>bare</p>"]

    def test_empty_input(self):
        assert split_top_level_html("") == []
        assert split_top_level_html("   ") == []

    def test_mammoth_style_concatenation(self):
        html = "<h1>T</h1><p>x</p><ul><li>i</li></ul>"
        assert split_top_level_html(html) == ["<h1>T</h1>", "<p>x</p>", "<ul><li>i</li></ul>"]


class TestPdfDictToHtml:
    @staticmethod
    def _block(lines):
        return {"type": 0, "lines": lines}

    @staticmethod
    def _line(*spans):
        return {"spans": list(spans)}

    def test_body_text_is_a_paragraph(self):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {
                                "text": "Hello world.",
                                "size": 12.0,
                                "font": "Helvetica",
                                "flags": 0,
                            },
                        ),
                    ],
                ),
            ],
        }
        assert pdf_dict_to_html(d) == "<p>Hello world.</p>"

    def test_larger_text_becomes_a_heading(self):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {
                                "text": "Chapter One",
                                "size": 24.0,
                                "font": "Helvetica",
                                "flags": 0,
                            },
                        ),
                    ],
                ),
                self._block(
                    [
                        self._line(
                            {
                                "text": "Body text of the chapter.",
                                "size": 12.0,
                                "font": "Helvetica",
                                "flags": 0,
                            },
                        ),
                    ],
                ),
            ],
        }
        html = pdf_dict_to_html(d)
        assert html.startswith("<h1>Chapter One</h1>")
        assert "<p>Body text of the chapter.</p>" in html

    def test_bold_and_italic_spans_keep_emphasis(self):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {"text": "mix ", "size": 12.0, "font": "Helvetica", "flags": 0},
                            {
                                "text": "bold",
                                "size": 12.0,
                                "font": "Helvetica-Bold",
                                "flags": 16,
                            },
                            {
                                "text": " and ",
                                "size": 12.0,
                                "font": "Helvetica",
                                "flags": 0,
                            },
                            {
                                "text": "italic",
                                "size": 12.0,
                                "font": "Helvetica-Oblique",
                                "flags": 2,
                            },
                        ),
                    ],
                ),
            ],
        }
        html = pdf_dict_to_html(d)
        assert "<strong>bold</strong>" in html
        assert "<em>italic</em>" in html

    def test_visual_lines_join_with_spaces(self):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {"text": "wrapped ", "size": 12.0, "font": "Helvetica", "flags": 0},
                        ),
                        self._line(
                            {"text": "line.", "size": 12.0, "font": "Helvetica", "flags": 0},
                        ),
                    ],
                ),
            ],
        }
        assert pdf_dict_to_html(d) == "<p>wrapped line.</p>"

    def test_image_blocks_are_ignored(self):
        d = {"blocks": [{"type": 1, "bbox": [0, 0, 1, 1]}]}
        assert pdf_dict_to_html(d) == ""

    def test_empty_page(self):
        assert pdf_dict_to_html({"blocks": []}) == ""

    def test_text_is_escaped(self):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {
                                "text": "a < b",
                                "size": 12.0,
                                "font": "Helvetica",
                                "flags": 0,
                            },
                        ),
                    ],
                ),
            ],
        }
        assert pdf_dict_to_html(d) == "<p>a &lt; b</p>"

    @pytest.mark.parametrize("size,tag", [(12.0, "p"), (14.0, "h3"), (16.0, "h2"), (20.0, "h1")])
    def test_heading_thresholds(self, size, tag):
        d = {
            "blocks": [
                self._block(
                    [
                        self._line(
                            {"text": "Sample", "size": 12.0, "font": "Helvetica", "flags": 0},
                        ),
                    ],
                ),
                self._block(
                    [
                        self._line(
                            {"text": "Sample", "size": size, "font": "Helvetica", "flags": 0},
                        ),
                    ],
                ),
            ],
        }
        html = pdf_dict_to_html(d)
        assert f"<{tag}>Sample</{tag}>" in html


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-v"]))
