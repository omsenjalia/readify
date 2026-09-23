"""Tests for the Python tokenizer and Markdown stripper.

These mirror `web/src/lib/tokenize.test.ts` and `markdown.test.ts`. The two
implementations are deliberately separate (different processes, different
languages) but they must agree on the cases the product depends on, so any
change to one should be reflected in the other's tests.
"""

import pytest

from services.text_service import (
    extract_text,
    markdown_to_plain,
    prepare_readable_text,
    tokenize_words,
)


class TestTokenizeWords:
    def test_splits_plain_prose(self):
        assert tokenize_words("the quick brown fox") == [
            "the",
            "quick",
            "brown",
            "fox",
        ]

    def test_empty_input(self):
        assert tokenize_words("") == []
        assert tokenize_words("   \n  ") == []

    def test_strips_leading_and_trailing_punctuation(self):
        assert tokenize_words('"hello," she said.') == ["hello", "she", "said"]

    def test_normalises_non_breaking_space(self):
        assert tokenize_words("alpha\u00a0beta") == ["alpha", "beta"]

    def test_removes_zero_width_characters(self):
        assert tokenize_words("al\u200bpha") == ["alpha"]

    def test_keeps_a_standalone_equation_as_one_token(self):
        tokens = tokenize_words("F = qv × B")
        assert len(tokens) == 1
        assert "qv" in tokens[0]

    def test_bullet_line_stays_one_unit(self):
        tokens = tokenize_words("• first bullet point here")
        assert len(tokens) == 1
        assert tokens[0].startswith("•")

    def test_handles_devanagari(self):
        assert tokenize_words("नमस्ते दुनिया") == ["नमस्ते", "दुनिया"]


class TestMarkdownToPlain:
    def test_removes_headings(self):
        assert markdown_to_plain("## Section\nbody") == "Section\nbody"

    def test_unwraps_emphasis_and_code(self):
        assert markdown_to_plain("a **bold** b `code` c") == "a bold b code c"

    def test_keeps_link_text_drops_url(self):
        assert markdown_to_plain("see [the docs](https://x.test)") == "see the docs"

    def test_keeps_image_alt_text(self):
        assert markdown_to_plain("![a cat](cat.png)") == "a cat"

    def test_unwraps_code_fences(self):
        assert markdown_to_plain("```py\nx = 1\n```") == "x = 1"

    def test_strips_blockquote_and_list_markers(self):
        assert markdown_to_plain("> quoted") == "quoted"
        assert markdown_to_plain("- a\n- b\n1. c") == "a\nb\nc"

    def test_strips_raw_html(self):
        assert markdown_to_plain("<div>hi</div>") == "hi"

    def test_plain_text_passes_through(self):
        assert markdown_to_plain("plain sentence.") == "plain sentence."


class TestPrepareReadableText:
    def test_detects_and_strips_markdown(self):
        assert prepare_readable_text("# H\n\ntext") == "H\n\ntext"

    def test_forces_markdown_stripping(self):
        assert prepare_readable_text("**x**", force_markdown=True) == "x"

    def test_leaves_plain_text_alone(self):
        plain = "no markup here at all"
        assert prepare_readable_text(plain) == plain


class TestExtractText:
    def test_splits_paragraphs_on_blank_lines(self):
        blocks = extract_text("first para\n\nsecond para")
        assert [b["text"] for b in blocks] == ["first para", "second para"]
        assert [b["html"] for b in blocks] == [
            "<p>first para</p>",
            "<p>second para</p>",
        ]

    def test_joins_lines_inside_a_paragraph(self):
        blocks = extract_text("one\ntwo")
        assert blocks[0]["text"] == "one two"
        assert blocks[0]["html"] == "<p>one<br>\ntwo</p>"

    def test_html_escapes_markup_in_plain_text(self):
        blocks = extract_text("a <b> & c")
        assert blocks[0]["html"] == "<p>a &lt;b&gt; &amp; c</p>"

    def test_markdown_syntax_stays_out_of_html(self):
        # Markdown is stripped first; the editor shows the rendered-free
        # plain paragraph, never the raw markers.
        blocks = extract_text("# Title\n\nSome **bold** text")
        for block in blocks:
            assert "#" not in block["html"]
            assert "**" not in block["html"]

    def test_empty_input(self):
        assert extract_text("") == []
        assert extract_text("   \n\n  ") == []

    @pytest.mark.parametrize("text", ["only", "  padded  "])
    def test_single_paragraph_needs_no_blank_line(self, text):
        blocks = extract_text(text)
        assert len(blocks) == 1
        assert blocks[0]["type"] == "paragraph"
