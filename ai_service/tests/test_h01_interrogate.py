"""QAD H-01 — interrogate node returns clarifying questions."""

import pytest

from ai_service.graph.nodes import interrogate_node


@pytest.mark.asyncio
async def test_interrogate_returns_at_least_one_question(sample_need: str):
    state = {
        "need": sample_need,
        "context": {"region": "Metro Manila", "population": "Out-of-school youth"},
        "tokens_used": 0,
    }
    state = await interrogate_node(state)  # type: ignore[arg-type]

    questions = state.get("interrogation_questions", [])
    assert len(questions) >= 1
    assert all(isinstance(q, str) and len(q) > 10 for q in questions)


@pytest.mark.asyncio
async def test_interrogate_includes_context_in_questions(sample_need: str):
    state = {
        "need": sample_need,
        "context": {"region": "Cebu", "population": "fishing families"},
        "tokens_used": 0,
    }
    state = await interrogate_node(state)  # type: ignore[arg-type]

    joined = " ".join(state.get("interrogation_questions", []))
    assert "Cebu" in joined or "fishing" in joined
