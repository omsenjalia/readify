"""In-memory job registry for `POST /api/process`.

Extracted from the router so the store can be exercised without spinning up
FastAPI, and so its single-process limitation is documented in one place.

.. warning::
   This store is per-process. With more than one worker (``uvicorn --workers``,
   multiple Railway replicas) a status poll can land on an instance that never
   saw the job and get a 404. Replace with Redis/Postgres before scaling out.
"""

import threading
from typing import Any


class JobStore:
    """Thread-safe map of job id -> status payload."""

    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def set(self, job_id: str, status: str, **extra: Any) -> None:
        """Record a job's status, replacing any previous payload."""
        with self._lock:
            self._jobs[job_id] = {"status": status, **extra}

    def get(self, job_id: str) -> dict[str, Any] | None:
        """Return a snapshot of a job's state, or None if unknown."""
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job is not None else None

    def update(self, job_id: str, status: str, **extra: Any) -> None:
        """Merge fields into an existing job (creating it if absent)."""
        with self._lock:
            current = self._jobs.setdefault(job_id, {})
            current.update(status=status, **extra)

    def clear(self) -> None:
        """Drop every job. Used by tests."""
        with self._lock:
            self._jobs.clear()
