"""Test doubles for the Supabase client.

`supabase.table(...)` returns a fluent query builder whose calls are chained
and only executed at `.execute()`. These fakes record every operation so tests
can assert on *ordering* — which matters because the document is only allowed
to flip to `ready` after its content blocks have landed.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Operation:
    """One recorded call against the fake client."""

    name: str
    table: str
    payload: Any = None

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"Operation({self.name!r}, {self.table!r}, payload={self.payload!r})"


@dataclass
class _Result:
    data: list[dict] | None = None


class FakeQuery:
    """Fluent query builder that records calls instead of hitting Postgres."""

    def __init__(self, table: str, owner: "FakeSupabase") -> None:
        self.table = table
        self._owner = owner
        self._pending: Operation | None = None

    # --- builder methods ------------------------------------------------
    def delete(self) -> "FakeQuery":
        self._pending = Operation("delete", self.table)
        self._owner.ops.append(self._pending)
        return self

    def insert(self, payload: Any) -> "FakeQuery":
        self._pending = Operation("insert", self.table, payload)
        self._owner.ops.append(self._pending)
        return self

    def update(self, payload: Any) -> "FakeQuery":
        self._pending = Operation("update", self.table, payload)
        self._owner.ops.append(self._pending)
        return self

    def select(self, *args: Any) -> "FakeQuery":
        self._owner.selects.append((self.table, args))
        return self

    def eq(self, *args: Any) -> "FakeQuery":
        return self

    # --- terminal call --------------------------------------------------
    def execute(self) -> _Result:
        if self._pending is not None and self._pending.name == "insert":
            if self.table == "content_blocks" and self._owner.fail_first_content_insert:
                self._owner.fail_first_content_insert = False
                self._owner.content_inserts += 1
                raise RuntimeError('column "needs_ocr" does not exist')
            if self.table == "content_blocks":
                self._owner.content_inserts += 1

        if self.table == "documents":
            return _Result(data=[{"id": "doc"}] if self._owner.document_exists else [])
        return _Result(data=[])


@dataclass
class FakeSupabase:
    """Stand-in for `supabase.Client` recording every operation."""

    document_exists: bool = True
    fail_first_content_insert: bool = False
    ops: list[Operation] = field(default_factory=list)
    selects: list[tuple] = field(default_factory=list)
    content_inserts: int = 0

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(name, self)

    def ops_named(self, name: str) -> list[Operation]:
        """All recorded operations with the given name."""
        return [op for op in self.ops if op.name == name]
