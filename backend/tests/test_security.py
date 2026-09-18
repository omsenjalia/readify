"""Tests for the processor shared-secret dependency."""

import pytest
from fastapi import HTTPException

from security import PLACEHOLDER_SECRET, require_processor_secret


class TestRequireProcessorSecret:
    def test_accepts_bearer_token(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret")
        require_processor_secret(authorization="Bearer s3cret", x_processor_secret=None)

    def test_accepts_legacy_header(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret")
        require_processor_secret(authorization=None, x_processor_secret="s3cret")

    def test_bearer_is_case_insensitive(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret")
        require_processor_secret(authorization="bearer s3cret", x_processor_secret=None)

    def test_rejects_wrong_token(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret")
        with pytest.raises(HTTPException) as exc:
            require_processor_secret(authorization="Bearer wrong", x_processor_secret=None)
        assert exc.value.status_code == 401

    def test_rejects_missing_credentials(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret")
        with pytest.raises(HTTPException) as exc:
            require_processor_secret(authorization=None, x_processor_secret=None)
        assert exc.value.status_code == 401

    def test_rejects_a_token_that_is_a_prefix_of_the_secret(self, monkeypatch):
        # A non-constant-time compare would still reject this, but the check
        # must not be fooled by partial matches either.
        monkeypatch.setenv("PROCESSOR_SECRET", "s3cret-value")
        with pytest.raises(HTTPException):
            require_processor_secret(authorization="Bearer s3cret", x_processor_secret=None)

    def test_503_when_secret_is_unset(self, monkeypatch):
        monkeypatch.delenv("PROCESSOR_SECRET", raising=False)
        with pytest.raises(HTTPException) as exc:
            require_processor_secret(authorization="Bearer anything", x_processor_secret=None)
        assert exc.value.status_code == 503

    def test_503_when_secret_is_the_shipped_placeholder(self, monkeypatch):
        monkeypatch.setenv("PROCESSOR_SECRET", PLACEHOLDER_SECRET)
        with pytest.raises(HTTPException) as exc:
            require_processor_secret(
                authorization=f"Bearer {PLACEHOLDER_SECRET}", x_processor_secret=None
            )
        assert exc.value.status_code == 503
