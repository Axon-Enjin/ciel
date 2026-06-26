"""QAD H-04 — deterministic signal engine."""

from ai_service.services.signal_engine import (
    SIGNAL_ADAPT,
    SIGNAL_SCALE,
    SIGNAL_STOP,
    classify_signal,
    evaluate_assumptions,
)


def test_classify_adapt_when_below_threshold():
    assert classify_signal(9.0, 12.0) == SIGNAL_ADAPT


def test_classify_stop_when_well_below_threshold():
    assert classify_signal(8.0, 12.0) == SIGNAL_STOP


def test_classify_scale_when_above_threshold():
    assert classify_signal(15.0, 12.0) == SIGNAL_SCALE


def test_evaluate_assumptions_fires_adapt():
    assumptions = [
        {
            "id": "a1",
            "statement": "Attendance holds",
            "indicator": "attendance_per_session",
            "threshold": 12.0,
        }
    ]
    points = {"attendance_per_session": [9.0, 9.5, 9.2]}
    signals = evaluate_assumptions(assumptions, points)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SIGNAL_ADAPT
    assert "attendance" in signals[0]["rationale"].lower()


def test_evaluate_no_signal_when_on_track():
    assumptions = [
        {
            "id": "a1",
            "statement": "Attendance holds",
            "indicator": "attendance_per_session",
            "threshold": 12.0,
        }
    ]
    points = {"attendance_per_session": [12.0, 13.0, 12.5]}
    signals = evaluate_assumptions(assumptions, points)
    assert signals == []
