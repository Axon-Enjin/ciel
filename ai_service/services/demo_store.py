"""In-memory store for the local development demo path.

This module exists solely to let the ToC vertical slice run end-to-end on a
developer machine **without** a live Supabase instance — the "thin demo path"
required by PRD §9 milestone M3. It is gated behind ``ENVIRONMENT=development``
by the router and is never used in staging/production, where the real Supabase
client persists data.

State is process-local and non-durable (lost on restart). It deliberately does
not implement RLS, auditing, or any persistence guarantees — those belong to the
Supabase path.
"""

from __future__ import annotations

import uuid
from typing import Any


class DemoStore:
    """Process-local stand-in for the subset of DB calls the ToC slice needs."""

    def __init__(self) -> None:
        self._tocs: dict[str, dict[str, Any]] = {}
        self._critiques: dict[str, list[dict[str, Any]]] = {}

    def insert_toc(self, toc_data: dict[str, Any]) -> dict[str, Any]:
        toc_id = str(toc_data.get("id") or uuid.uuid4())
        record = {**toc_data, "id": toc_id}
        self._tocs[toc_id] = record
        self._critiques.setdefault(toc_id, [])
        return record

    def get_toc(self, toc_id: str) -> dict[str, Any] | None:
        return self._tocs.get(toc_id)

    def update_toc(self, toc_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        record = self._tocs.setdefault(toc_id, {"id": toc_id})
        record.update(updates)
        return record

    def insert_toc_critique(self, critique_data: dict[str, Any]) -> dict[str, Any]:
        toc_id = str(critique_data["toc_id"])
        record = {**critique_data, "id": str(uuid.uuid4())}
        self._critiques.setdefault(toc_id, []).append(record)
        return record

    def get_toc_critiques(self, toc_id: str) -> list[dict[str, Any]]:
        return self._critiques.get(toc_id, [])

    def acknowledge_critique_simple(self, critique_id: str) -> dict[str, Any]:
        for critiques in self._critiques.values():
            for critique in critiques:
                if str(critique["id"]) == str(critique_id):
                    critique["acknowledged"] = True
                    return critique
        return {}

    def insert_toc_assumptions(
        self, assumptions: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        return [{**a, "id": str(uuid.uuid4())} for a in assumptions]


# Process-local singleton used by the router's development fallback.
demo_store = DemoStore()
