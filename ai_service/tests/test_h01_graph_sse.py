"""QAD H-01 — SSE emits full graph events for all node types."""

from __future__ import annotations

import json
import uuid
from unittest.mock import MagicMock, patch

import pytest

from ai_service.graph.nodes import NODE_TYPE_ORDER
from ai_service.models.toc import TocGenerationRequest
from ai_service.routers.toc import _run_pipeline


def _parse_sse_chunks(chunks: list[str]) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    for chunk in chunks:
        event_name = "message"
        data: dict = {}
        for line in chunk.strip().split("\n"):
            if line.startswith("event:"):
                event_name = line[6:].strip()
            elif line.startswith("data:"):
                data = json.loads(line[5:].strip())
        if data:
            events.append((event_name, data))
    return events


@pytest.mark.asyncio
async def test_sse_emits_interrogation_and_full_graph(sample_need: str):
    mock_store = MagicMock()
    toc_id = str(uuid.uuid4())
    mock_store.insert_toc.return_value = {"id": toc_id}
    mock_store.insert_toc_critique.side_effect = [
        {"id": str(uuid.uuid4())},
        {"id": str(uuid.uuid4())},
    ]

    request = TocGenerationRequest(
        project_id=uuid.uuid4(),
        org_id=uuid.uuid4(),
        need=sample_need,
        context={"region": "Metro Manila"},
    )

    chunks: list[str] = []
    with patch("ai_service.routers.toc._persistence", return_value=mock_store):
        async for chunk in _run_pipeline(request):
            chunks.append(chunk)

    events = _parse_sse_chunks(chunks)
    event_names = [name for name, _ in events]

    assert "interrogation_question" in event_names
    assert "graph_complete" in event_names
    assert "run_finished" in event_names

    deltas = [data for name, data in events if name == "toc_delta"]
    delta_types = {d["type"] for d in deltas}
    for node_type in NODE_TYPE_ORDER:
        assert node_type in delta_types, f"Missing toc_delta for {node_type}"

    graph_complete = next(data for name, data in events if name == "graph_complete")
    assert len(graph_complete.get("nodes", [])) >= len(NODE_TYPE_ORDER)
    assert graph_complete.get("edges")
