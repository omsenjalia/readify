"""End-to-end tests for the processor API.

These boot the real FastAPI app with `TestClient`, so they cover the wiring the
router rewrite touched: authentication, request validation, the background job,
the `content_blocks` -> `documents` write order, and the status contract.

Supabase is replaced by an in-memory fake; no credentials or network needed.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

import main
from routers import process as process_router

SECRET = "test-secret"

#: Headers for the configured-secret client.
AUTH = {"Authorization": f"Bearer {SECRET}"}


# --------------------------------------------------------------------------
# In-memory Supabase stand-in
# --------------------------------------------------------------------------


class _Query:
    """Records the pending operation and applies it on `.execute()`."""

    def __init__(self, store: "FakeSupabase", table: str) -> None:
        self._store = store
        self._table = table
        self._op: str | None = None
        self._payload: Any = None
        self._filters: dict[str, Any] = {}
        self._cols: tuple[str, ...] = ()

    def select(self, *cols: str) -> "_Query":
        self._op = "select"
        # PostgREST returns only the requested columns, so `select("slug")`
        # yields `{"slug": None}` for a NULL slug — not the whole row. The
        # fake has to project for the same reason, or it hides bugs.
        self._cols = cols
        return self

    def insert(self, payload: Any) -> "_Query":
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict) -> "_Query":
        self._op = "update"
        self._payload = payload
        return self

    def delete(self) -> "_Query":
        self._op = "delete"
        return self

    def eq(self, column: str, value: Any) -> "_Query":
        self._filters[column] = value
        return self

    def execute(self) -> Any:
        self._store.calls.append((self._table, self._op, self._payload))
        data = self._store.apply(self._table, self._op, self._payload, self._filters)
        if self._op == "select" and self._cols and self._cols != ("*",):
            data = [
                {col: row.get(col) for col in self._cols}
                for row in data
            ]
        return _Result(data)


class _Result:
    def __init__(self, data: list[dict] | None) -> None:
        self.data = data


class _Storage:
    def __init__(self, payload: bytes = b"") -> None:
        self.payload = payload

    def from_(self, _bucket: str) -> "_Storage":
        return self

    def download(self, _path: str) -> bytes:
        return self.payload


class FakeSupabase:
    """Minimal in-memory implementation of the client surface the app uses."""

    def __init__(self) -> None:
        self.documents: dict[str, dict] = {}
        self.blocks: list[dict] = []
        self.calls: list[tuple] = []
        self.storage = _Storage()

    def table(self, name: str) -> _Query:
        return _Query(self, name)

    def apply(self, table, op, payload, filters):
        if table == "content_blocks":
            if op == "delete":
                doc_id = filters.get("document_id")
                self.blocks = [b for b in self.blocks if b["document_id"] != doc_id]
                return []
            if op == "insert":
                self.blocks.extend(payload if isinstance(payload, list) else [payload])
                return payload
            return []

        if table == "documents":
            if op == "select":
                doc = self.documents.get(filters.get("id"))
                return [dict(doc)] if doc else []
            if op == "insert":
                self.documents[payload["id"]] = dict(payload)
                return [payload]
            if op == "update":
                # PostgREST semantics: filtering on a missing row updates
                # nothing. It does NOT upsert.
                doc = self.documents.get(filters.get("id"))
                if doc is None:
                    return []
                doc.update(payload)
                return [doc]
            return []

        return []

    # --- assertions helpers -------------------------------------------
    def op_index(self, table: str, op: str, predicate=None) -> int:
        """Index of the first matching call, for ordering assertions."""
        for i, (t, o, payload) in enumerate(self.calls):
            if t == table and o == op and (predicate is None or predicate(payload)):
                return i
        raise AssertionError(f"no {op} on {table} matching predicate in {self.calls}")


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------


@pytest.fixture
def fake_supabase(monkeypatch) -> FakeSupabase:
    fake = FakeSupabase()
    # The router imported `get_supabase` by name, so patch it there.
    monkeypatch.setattr(process_router, "get_supabase", lambda: fake)
    # Skip the lifespan's connectivity probe (it would build a real client).
    monkeypatch.setattr(main, "verify_connection", lambda: True)
    return fake


@pytest.fixture
def client(fake_supabase, monkeypatch) -> TestClient:
    """An app with PROCESSOR_SECRET configured."""
    monkeypatch.setenv("PROCESSOR_SECRET", SECRET)
    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def anon_client(fake_supabase, monkeypatch) -> TestClient:
    """An app with no PROCESSOR_SECRET, as an unconfigured deploy would be."""
    monkeypatch.delenv("PROCESSOR_SECRET", raising=False)
    with TestClient(main.app) as c:
        yield c


def seed_document(fake: FakeSupabase, document_id: str = "doc-1") -> None:
    """Insert the row the web app creates before dispatching a job.

    The client always inserts `documents` first and then POSTs its id, so the
    worker can assume the row exists. Tests that exercise the failure path need
    it present, otherwise the error update would match no rows.
    """
    fake.documents[document_id] = {"id": document_id, "status": "processing"}


def assert_blocks_precede_ready(fake: FakeSupabase) -> None:
    """The content must land before the document is advertised as ready."""
    block_insert = fake.op_index("content_blocks", "insert")
    ready_write = min(
        fake.op_index("documents", op, lambda p: p.get("status") == "ready")
        for op in ("insert", "update")
        if any(
            t == "documents" and o == op and (p or {}).get("status") == "ready"
            for t, o, p in fake.calls
        )
    )
    assert block_insert < ready_write, (
        f"status flipped to ready before blocks landed: {fake.calls}"
    )


def post_process(client: TestClient, headers: dict, **body) -> Any:
    body.setdefault("document_id", "doc-1")
    body.setdefault("title", "My Doc")
    return client.post("/api/process", json=body, headers=headers)


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------


class TestHealth:
    def test_health_is_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


# --------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------


class TestAuth:
    def test_unconfigured_secret_returns_503(self, anon_client):
        # No PROCESSOR_SECRET in the environment: the endpoint is unusable
        # rather than wide open, so a misconfigured deploy fails loudly.
        response = post_process(anon_client, {}, source_type="text", raw_text="hi")
        assert response.status_code == 503

    def test_wrong_secret_returns_401(self, client):
        response = post_process(
            client,
            {"Authorization": "Bearer nope"},
            source_type="text",
            raw_text="hi",
        )
        assert response.status_code == 401

    def test_missing_header_returns_401(self, client):
        response = post_process(client, {}, source_type="text", raw_text="hi")
        assert response.status_code == 401

    def test_bearer_token_is_accepted(self, client):
        response = post_process(
            client, AUTH, source_type="text", raw_text="hello world"
        )
        assert response.status_code == 202

    def test_legacy_header_is_still_accepted(self, client):
        response = post_process(
            client,
            {"X-Processor-Secret": SECRET},
            source_type="text",
            raw_text="hello world",
        )
        assert response.status_code == 202

    def test_status_endpoint_is_also_protected(self, anon_client):
        assert anon_client.get("/api/status/anything").status_code == 503


# --------------------------------------------------------------------------
# Request validation
# --------------------------------------------------------------------------


class TestValidation:
    def test_pdf_without_storage_path_is_rejected_up_front(self, client):
        # Previously this was discovered inside the background task, so the
        # caller got a 202 and the document silently failed later.
        response = post_process(client, AUTH, source_type="pdf")
        assert response.status_code == 422

    def test_youtube_without_url_is_rejected(self, client):
        response = post_process(client, AUTH, source_type="youtube")
        assert response.status_code == 422

    def test_text_without_raw_text_is_rejected(self, client):
        response = post_process(client, AUTH, source_type="text")
        assert response.status_code == 422

    def test_whitespace_only_text_is_rejected(self, client):
        response = post_process(
            client, AUTH, source_type="text", raw_text="   \n  "
        )
        assert response.status_code == 422

    def test_unknown_source_type_is_rejected(self, client):
        response = post_process(
            client, AUTH, source_type="epub", raw_text="hi"
        )
        assert response.status_code == 422


# --------------------------------------------------------------------------
# The happy path
# --------------------------------------------------------------------------


class TestTextJob:
    def test_returns_202_with_a_job_id(self, client):
        response = post_process(
            client, AUTH, source_type="text", raw_text="one two three"
        )
        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "accepted"
        assert body["job_id"]

    def test_job_reaches_completed_with_slug_and_word_count(self, client):
        job_id = post_process(
            client, AUTH, source_type="text", raw_text="one two three"
        ).json()["job_id"]

        status = client.get(f"/api/status/{job_id}", headers=AUTH).json()
        assert status["status"] == "completed"
        assert status["document_id"] == "doc-1"
        assert status["word_count"] == 3
        assert status["slug"]

    def test_words_are_persisted_as_one_block(self, client, fake_supabase):
        post_process(
            client, AUTH, source_type="text", raw_text="alpha\n\nbeta gamma"
        )
        assert len(fake_supabase.blocks) == 2
        assert fake_supabase.blocks[0]["words"] == ["alpha"]
        assert fake_supabase.blocks[1]["words"] == ["beta", "gamma"]
        assert [b["position"] for b in fake_supabase.blocks] == [0, 1]

    def test_txt_source_type_is_normalised_to_text(self, client, fake_supabase):
        post_process(client, AUTH, source_type="txt", raw_text="hello there")
        assert fake_supabase.documents["doc-1"]["source_type"] == "text"

    def test_document_is_marked_ready(self, client, fake_supabase):
        post_process(client, AUTH, source_type="text", raw_text="hi")
        doc = fake_supabase.documents["doc-1"]
        assert doc["status"] == "ready"
        assert doc["error_msg"] is None
        assert doc["progress_msg"] is None

    def test_blocks_are_written_before_the_status_flips(self, client, fake_supabase):
        # The old ordering set status=ready first, so a failed insert left a
        # document marked ready with no content.
        #
        # With no pre-existing row `persist_document` inserts one instead of
        # updating, so the "ready" write can be either an insert or an update;
        # the invariant is about the order, not the operation.
        post_process(client, AUTH, source_type="text", raw_text="hello world")
        assert_blocks_precede_ready(fake_supabase)

    def test_ordering_also_holds_when_the_row_already_exists(
        self, client, fake_supabase
    ):
        seed_document(fake_supabase)
        post_process(client, AUTH, source_type="text", raw_text="hello world")

        def documents_inserts():
            return [op for op in fake_supabase.calls if op[:2] == ("documents", "insert")]

        assert documents_inserts() == []
        assert_blocks_precede_ready(fake_supabase)

    def test_rerun_replaces_previous_blocks(self, client, fake_supabase):
        post_process(client, AUTH, source_type="text", raw_text="first")
        post_process(client, AUTH, source_type="text", raw_text="second third")
        assert len(fake_supabase.blocks) == 1
        assert fake_supabase.blocks[0]["words"] == ["second", "third"]

    def test_untitled_document_gets_a_placeholder_title(self, client, fake_supabase):
        post_process(client, AUTH, source_type="text", raw_text="hi", title=None)
        assert fake_supabase.documents["doc-1"]["title"] == "Untitled document"

    def test_null_slug_gets_generated_instead_of_crashing(self, client, fake_supabase):
        # A row exists but has no slug yet (column is nullable). The job must
        # generate one rather than raising a KeyError mid-extraction.
        seed_document(fake_supabase)
        job_id = post_process(
            client, AUTH, source_type="text", raw_text="hi"
        ).json()["job_id"]

        status = client.get(f"/api/status/{job_id}", headers=AUTH).json()
        assert status["status"] == "completed"
        assert status["slug"]

    def test_an_existing_slug_is_reused(self, client, fake_supabase):
        fake_supabase.documents["doc-1"] = {
            "id": "doc-1",
            "slug": "preexisting-slug",
            "visibility": "public",
            "is_favorite": True,
        }
        job_id = post_process(
            client, AUTH, source_type="text", raw_text="hi"
        ).json()["job_id"]

        status = client.get(f"/api/status/{job_id}", headers=AUTH).json()
        assert status["slug"] == "preexisting-slug"
        # User-owned fields survive a reprocess.
        assert fake_supabase.documents["doc-1"]["visibility"] == "public"
        assert fake_supabase.documents["doc-1"]["is_favorite"] is True


# --------------------------------------------------------------------------
# Failure paths
# --------------------------------------------------------------------------


class TestFailures:
    def test_bad_youtube_url_marks_the_document_as_errored(self, client, fake_supabase):
        seed_document(fake_supabase)
        job_id = post_process(
            client,
            AUTH,
            source_type="youtube",
            youtube_url="https://vimeo.com/12345",
        ).json()["job_id"]

        status = client.get(f"/api/status/{job_id}", headers=AUTH).json()
        assert status["status"] == "failed"
        assert "YouTube" in status["error"]
        assert fake_supabase.documents["doc-1"]["status"] == "error"
        assert fake_supabase.documents["doc-1"]["error_msg"]

    def test_image_source_fails_cleanly_rather_than_crashing(
        self, client, fake_supabase
    ):
        seed_document(fake_supabase)
        job_id = post_process(
            client, AUTH, source_type="image", storage_path="x.png"
        ).json()["job_id"]
        status = client.get(f"/api/status/{job_id}", headers=AUTH).json()
        assert status["status"] == "failed"
        assert "image" in status["error"].lower()

    def test_unknown_job_returns_404(self, client):
        assert (
            client.get("/api/status/does-not-exist", headers=AUTH).status_code
            == 404
        )
