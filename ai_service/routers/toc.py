"""ToC generation and lock endpoints (RFC-001)."""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ai_service.config import settings
from ai_service.models.toc import TocAssumption, TocGenerationRequest, TocLockRequest, TocLockResponse
from ai_service.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


def _persistence():
    """Return the persistence backend for ToC reads/writes.

    In production this is always the real Supabase client. In development, if
    Supabase is unreachable (no local stack / placeholder creds), fall back to a
    process-local in-memory store so the ToC vertical slice still runs
    end-to-end (PRD §9 milestone M3 "thin demo path"). The fallback is never
    used outside ``ENVIRONMENT=development``.
    """
    if settings.ENVIRONMENT != "development":
        return supabase_client
    try:
        # Touching `.client` lazily initializes the SDK and validates the key.
        _ = supabase_client.client
        return supabase_client
    except Exception as exc:  # noqa: BLE001 - dev convenience fallback
        from ai_service.services.demo_store import demo_store

        logger.warning(
            "Supabase unavailable in development, using in-memory demo store: %s",
            exc,
        )
        return demo_store


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _run_pipeline(request: TocGenerationRequest) -> AsyncIterator[str]:
    from ai_service.graph.nodes import (
        NODE_TYPE_ORDER,
        critique_node,
        draft_node,
        interrogate_node,
        retrieve_node,
    )

    started = time.time()
    final_state: dict = {
        "project_id": str(request.project_id),
        "org_id": str(request.org_id),
        "need": request.need,
        "context": request.context,
        "tokens_used": 0,
    }

    node_funcs = [
        ("interrogate", interrogate_node),
        ("retrieve", retrieve_node),
        ("draft", draft_node),
        ("critique", critique_node),
    ]

    for node_name, node_func in node_funcs:
        yield _sse("node_started", {"node": node_name})
        final_state = await node_func(final_state)  # type: ignore[arg-type]

        if node_name == "interrogate":
            for idx, question in enumerate(final_state.get("interrogation_questions", [])):
                yield _sse(
                    "interrogation_question",
                    {"index": idx, "text": question},
                )

        if node_name == "draft" and final_state.get("draft_graph"):
            graph = final_state["draft_graph"]
            nodes = graph.get("nodes", [])
            type_counters: dict[str, int] = {}
            for node_type in NODE_TYPE_ORDER:
                for node in [n for n in nodes if n.get("type") == node_type]:
                    idx = type_counters.get(node_type, 0)
                    type_counters[node_type] = idx + 1
                    yield _sse(
                        "toc_delta",
                        {
                            "path": f"nodes[{node.get('id', f'{node_type}-{idx}')}]",
                            "id": node.get("id", ""),
                            "type": node.get("type", ""),
                            "text": node.get("text", ""),
                            "source_ids": node.get("source_ids", []),
                        },
                    )
            yield _sse(
                "graph_complete",
                {
                    "nodes": nodes,
                    "edges": graph.get("edges", []),
                },
            )

        if node_name == "critique":
            for critique in final_state.get("critiques", []):
                yield _sse(
                    "failure_prompt",
                    {
                        "prompt": critique.get("prompt", ""),
                        "source_ids": critique.get("source_ids", []),
                    },
                )

    # Persist ToC + critiques (real DB, or in-memory demo store in dev)
    store = _persistence()
    toc_id = str(uuid.uuid4())
    try:
        inserted = store.insert_toc(
            {
                "id": toc_id,
                "project_id": str(request.project_id),
                "version": 1,
                "graph": final_state.get("draft_graph", {}),
                "status": "draft",
                "failure_prompts_ack": False,
            }
        )
        toc_id = inserted["id"]

        critique_ids: list[str] = []
        for critique in final_state.get("critiques", []):
            row = store.insert_toc_critique(
                {
                    "toc_id": toc_id,
                    "prompt": critique.get("prompt", ""),
                    "source_ids": critique.get("source_ids", []),
                    "acknowledged": False,
                }
            )
            critique_ids.append(row["id"])
    except Exception as exc:
        logger.error("Failed to persist ToC: %s", exc)
        yield _sse("error", {"message": "Failed to persist ToC draft"})
        return

    elapsed_ms = int((time.time() - started) * 1000)
    yield _sse(
        "run_finished",
        {
            "toc_id": toc_id,
            "critique_ids": critique_ids,
            "tokens_used": final_state.get("tokens_used", 0),
            "generation_time_ms": elapsed_ms,
        },
    )


@router.post("/generate")
async def generate_toc(request: TocGenerationRequest):
    """Stream ToC generation as Server-Sent Events."""
    store = _persistence()
    # The demo store has no projects table; skip the existence check when the
    # in-memory dev fallback is active (the client already authorized the user).
    if store is supabase_client:
        project = supabase_client.get_project(str(request.project_id))
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    return StreamingResponse(
        _run_pipeline(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{toc_id}/lock", response_model=TocLockResponse)
async def lock_toc(toc_id: str, request: TocLockRequest):
    """Lock a ToC after all failure prompts are acknowledged."""
    if str(request.toc_id) != toc_id:
        raise HTTPException(status_code=400, detail="toc_id mismatch")

    store = _persistence()

    toc = store.get_toc(toc_id)
    if not toc:
        raise HTTPException(status_code=404, detail="ToC not found")
    if toc.get("status") == "locked":
        raise HTTPException(status_code=409, detail="ToC already locked")

    critiques = store.get_toc_critiques(toc_id)
    if not critiques:
        raise HTTPException(status_code=409, detail="No failure prompts to acknowledge")

    ack_set = {str(i) for i in request.acknowledged_critique_ids}
    for critique in critiques:
        if str(critique["id"]) in ack_set:
            store.acknowledge_critique_simple(str(critique["id"]))

    refreshed = store.get_toc_critiques(toc_id)
    if any(not c.get("acknowledged") for c in refreshed):
        raise HTTPException(
            status_code=409,
            detail="All failure prompts must be acknowledged before locking",
        )

    assumptions_payload = []
    graph = toc.get("graph", {})
    for node in graph.get("nodes", []):
        if node.get("type") == "outcome":
            assumptions_payload.append(
                {
                    "toc_id": toc_id,
                    "statement": f"Outcome holds: {node.get('text', '')}",
                    "indicator": "leading_outcome_rate",
                    "threshold": 12.0,
                }
            )
    if not assumptions_payload:
        assumptions_payload.append(
            {
                "toc_id": toc_id,
                "statement": "Core program activities reach intended participants",
                "indicator": "attendance_per_session",
                "threshold": 12.0,
            }
        )

    assumptions = [
        TocAssumption(
            id=row.get("id"),
            toc_id=uuid.UUID(toc_id),
            statement=row["statement"],
            indicator=row["indicator"],
            threshold=float(row["threshold"]) if row.get("threshold") is not None else None,
        )
        for row in store.insert_toc_assumptions(assumptions_payload)
    ]
    store.update_toc(
        toc_id,
        {"status": "locked", "failure_prompts_ack": True},
    )

    from datetime import datetime, timezone

    return TocLockResponse(
        toc_id=uuid.UUID(toc_id),
        status="locked",
        version=toc.get("version", 1),
        assumptions=assumptions,
        locked_at=datetime.now(timezone.utc),
    )
