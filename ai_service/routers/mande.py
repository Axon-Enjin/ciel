"""M&E signal evaluation (PRD-F3 / RFC-002)."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai_service.services.signal_engine import evaluate_assumptions
from ai_service.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()


class MandeEvaluateRequest(BaseModel):
    project_id: UUID = Field(..., description="Project to evaluate")


class SignalPayload(BaseModel):
    id: str | None = None
    assumption_id: str | None = None
    signal_type: str
    rationale: str
    indicator: str | None = None


class MandeEvaluateResponse(BaseModel):
    project_id: str
    signals: list[SignalPayload]


def _group_points(rows: list[dict]) -> dict[str, list[float]]:
    grouped: dict[str, list[float]] = {}
    for row in sorted(rows, key=lambda r: r.get("observed_at") or ""):
        ind = row.get("indicator")
        val = row.get("value")
        if ind is None or val is None:
            continue
        grouped.setdefault(str(ind), []).append(float(val))
    return grouped


@router.post("/evaluate", response_model=MandeEvaluateResponse)
async def evaluate_project_signals(request: MandeEvaluateRequest):
    """Run deterministic signal evaluation for a project's locked assumptions."""
    project_id = str(request.project_id)

    project = supabase_client.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assumptions = supabase_client.get_project_assumptions(project_id)
    if not assumptions:
        return MandeEvaluateResponse(project_id=project_id, signals=[])

    points = supabase_client.get_indicator_points(project_id, limit=50)
    grouped = _group_points(points)

    candidates = evaluate_assumptions(assumptions, grouped)
    inserted: list[SignalPayload] = []

    for cand in candidates:
        assumption_id = cand.get("assumption_id")
        signal_type = cand["signal_type"]
        if assumption_id and supabase_client.has_recent_signal(
            project_id, str(assumption_id), signal_type, hours=24
        ):
            continue
        row = supabase_client.insert_signal(
            {
                "project_id": project_id,
                "assumption_id": assumption_id,
                "signal_type": signal_type,
                "rationale": cand["rationale"],
            }
        )
        inserted.append(
            SignalPayload(
                id=row.get("id"),
                assumption_id=str(assumption_id) if assumption_id else None,
                signal_type=signal_type,
                rationale=cand["rationale"],
                indicator=cand.get("indicator"),
            )
        )

    return MandeEvaluateResponse(project_id=project_id, signals=inserted)
