"""Grant proposal generation endpoint (PRD-F2).

Stateless generation: the Next.js caller (holding the user's RLS session) passes
the locked ToC graph, assumptions, org, and funder profile. We stream the drafted
sections as Server-Sent Events so the UI can render the proposal as it is written.
Persistence of the resulting draft is owned by the web app (role-gated by RLS).
"""

from __future__ import annotations

import json
import time
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ai_service.graph.grant_nodes import build_alignment, draft_sections
from ai_service.models.grant import GrantGenerationRequest

router = APIRouter()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _run(req: GrantGenerationRequest) -> AsyncIterator[str]:
    started = time.time()

    sections, tokens = await draft_sections(req)

    # Stream each section as it "lands" — gives a live writing effect even when
    # running on the deterministic template path.
    for s in sections:
        yield _sse("section_started", {"key": s["key"], "heading": s["heading"]})
        yield _sse(
            "section_delta",
            {
                "key": s["key"],
                "heading": s["heading"],
                "content": s["content"],
                "source_ids": s["source_ids"],
            },
        )

    alignment = build_alignment(req, sections)
    yield _sse("alignment", {"alignment": alignment})

    elapsed_ms = int((time.time() - started) * 1000)
    yield _sse(
        "run_finished",
        {
            "sections": sections,
            "alignment": alignment,
            "tokens_used": tokens,
            "generation_time_ms": elapsed_ms,
        },
    )


@router.post("/generate")
async def generate_grant(request: GrantGenerationRequest):
    """Stream a funder-matched proposal draft as SSE."""
    return StreamingResponse(
        _run(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
