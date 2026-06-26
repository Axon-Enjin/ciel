"""Deterministic M&E signal engine (RFC-002 §5).

The LLM never decides scale/adapt/stop — only narrates rationale when requested.
"""

from __future__ import annotations

from statistics import mean
from typing import Any

SIGNAL_SCALE = "scale"
SIGNAL_ADAPT = "adapt"
SIGNAL_STOP = "stop"


def _template_rationale(
    signal_type: str,
    indicator: str,
    avg: float,
    threshold: float,
    statement: str,
) -> str:
    ind = indicator.replace("_", " ")
    if signal_type == SIGNAL_STOP:
        return (
            f"{ind} averaged {avg:.1f} over recent periods — well below the locked "
            f"assumption threshold of {threshold:.1f}. Worth pausing scale-up until "
            f"you address: {statement}"
        )
    if signal_type == SIGNAL_ADAPT:
        return (
            f"{ind} averaged {avg:.1f} over recent periods — below the threshold of "
            f"{threshold:.1f} for “{statement}”. Consider adjusting outreach or session "
            f"format before you commit more resources."
        )
    return (
        f"{ind} averaged {avg:.1f} — above the threshold of {threshold:.1f}. "
        f"The program may be ready to scale if other assumptions hold."
    )


def classify_signal(avg: float, threshold: float) -> str | None:
    """Map rolling average vs threshold to scale/adapt/stop."""
    if threshold <= 0:
        return None
    if avg < threshold * 0.75:
        return SIGNAL_STOP
    if avg < threshold:
        return SIGNAL_ADAPT
    if avg > threshold * 1.2:
        return SIGNAL_SCALE
    return None


def evaluate_assumptions(
    assumptions: list[dict[str, Any]],
    points_by_indicator: dict[str, list[float]],
    *,
    min_samples: int = 1,
) -> list[dict[str, Any]]:
    """Evaluate assumptions against recent indicator values.

    Returns signal payloads ready for DB insert (no LLM decision).
    """
    signals: list[dict[str, Any]] = []

    for assumption in assumptions:
        threshold = assumption.get("threshold")
        if threshold is None:
            continue
        try:
            threshold_f = float(threshold)
        except (TypeError, ValueError):
            continue

        indicator = str(assumption.get("indicator") or "").strip()
        if not indicator:
            continue

        values = points_by_indicator.get(indicator, [])
        recent = values[-3:] if len(values) >= min_samples else []
        if len(recent) < min_samples:
            continue

        avg = mean(recent)
        signal_type = classify_signal(avg, threshold_f)
        if not signal_type:
            continue

        statement = str(assumption.get("statement") or assumption.get("id") or indicator)
        signals.append(
            {
                "assumption_id": assumption.get("id"),
                "signal_type": signal_type,
                "indicator": indicator,
                "avg": avg,
                "threshold": threshold_f,
                "rationale": _template_rationale(
                    signal_type, indicator, avg, threshold_f, statement
                ),
            }
        )

    return signals
