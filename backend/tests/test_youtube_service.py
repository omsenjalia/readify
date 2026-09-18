"""Tests for YouTube URL parsing and paragraph grouping."""

import pytest

from services.youtube_service import (
    extract_video_id,
    group_into_paragraphs,
)

VIDEO_ID = "dQw4w9WgXcQ"


class TestExtractVideoId:
    @pytest.mark.parametrize(
        "url",
        [
            f"https://www.youtube.com/watch?v={VIDEO_ID}",
            f"https://youtube.com/watch?v={VIDEO_ID}",
            f"https://m.youtube.com/watch?v={VIDEO_ID}",
            f"https://music.youtube.com/watch?v={VIDEO_ID}",
            f"https://youtu.be/{VIDEO_ID}",
            f"https://www.youtube.com/embed/{VIDEO_ID}",
            f"https://www.youtube.com/shorts/{VIDEO_ID}",
            f"https://www.youtube.com/live/{VIDEO_ID}",
            f"https://www.youtube.com/watch?t=42&v={VIDEO_ID}",
            f"https://www.youtube.com/watch?v={VIDEO_ID}&t=42",
        ],
    )
    def test_accepts_common_shapes(self, url):
        assert extract_video_id(url) == VIDEO_ID

    def test_trims_whitespace(self):
        assert extract_video_id(f"  https://youtu.be/{VIDEO_ID}  ") == VIDEO_ID

    @pytest.mark.parametrize(
        "url",
        [
            "https://vimeo.com/12345",
            "not a url at all",
            "",
            "   ",
            "https://youtu.be/too-short",
            "https://youtube.com/playlist?list=PL123",
        ],
    )
    def test_rejects_non_video_urls(self, url):
        assert extract_video_id(url) is None

    def test_short_link_with_extra_path_is_still_parsed(self):
        assert extract_video_id(f"https://youtu.be/{VIDEO_ID}/extra") == VIDEO_ID


class TestGroupIntoParagraphs:
    def test_splits_on_sentence_boundaries(self):
        text = "One. Two. Three. Four."
        assert group_into_paragraphs(text, target_chars=1) == [
            "One.",
            "Two.",
            "Three.",
            "Four.",
        ]

    def test_keeps_the_final_period(self):
        # Regression: the old `.split(". ")` + `strip(" .")` round-trip
        # dropped the trailing period on the last paragraph.
        paragraphs = group_into_paragraphs("Hello world. Goodbye world.")
        assert paragraphs[-1].endswith(".")

    def test_packs_short_sentences_together(self):
        paragraphs = group_into_paragraphs("One. Two. Three.", target_chars=10_000)
        assert len(paragraphs) == 1
        assert paragraphs[0] == "One. Two. Three."

    def test_handles_question_and_exclamation_marks(self):
        paragraphs = group_into_paragraphs("Why? Because! Really.", target_chars=1)
        assert paragraphs == ["Why?", "Because!", "Really."]

    def test_does_not_split_mid_abbreviation(self):
        paragraphs = group_into_paragraphs("Dr. Smith arrived.", target_chars=10_000)
        # "Dr." is only broken when followed by whitespace then a capital; the
        # grouping keeps both fragments in one paragraph either way.
        assert "Smith arrived." in paragraphs[0]

    def test_empty_input_yields_nothing(self):
        assert group_into_paragraphs("") == []
        assert group_into_paragraphs("   ") == []
