"""QAD H-01 — grounded ToC generation (unit level)."""

import pytest

from ai_service.graph.nodes import draft_node, retrieve_node
from ai_service.models.toc import TocGraph


@pytest.mark.asyncio
async def test_template_draft_grounds_outcomes_or_flags_unverified(sample_need: str):
    """Every outcome must have source_ids or [UNVERIFIED] prefix (SDD §8.1)."""
    state = {
        "need": sample_need,
        "context": {"region": "Metro Manila"},
        "retrieved_evidence": [],
        "tokens_used": 0,
    }
    state = await retrieve_node(state)  # type: ignore[arg-type]
    state = await draft_node(state)  # type: ignore[arg-type]

    graph = TocGraph.model_validate(state["draft_graph"])
    outcomes = graph.get_nodes_by_type("outcome")
    assert len(outcomes) >= 1

    for outcome in outcomes:
        grounded = bool(outcome.source_ids) or outcome.text.startswith("[UNVERIFIED")
        assert grounded, f"Outcome not grounded: {outcome.text}"


@pytest.mark.asyncio
async def test_draft_with_evidence_cites_sources(sample_need: str):
    """When evidence is retrieved, outcomes should carry source_ids."""
    fake_source = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    state = {
        "need": sample_need,
        "context": {},
        "retrieved_evidence": [
            {
                "source_id": fake_source,
                "chunk_text": "Youth employment programs show 40% placement when attendance holds.",
                "tier": "T2",
                "citation": "Test corpus",
                "relevance_score": 0.9,
            }
        ],
        "tokens_used": 0,
    }
    state = await draft_node(state)  # type: ignore[arg-type]
    graph = TocGraph.model_validate(state["draft_graph"])
    outcomes = graph.get_nodes_by_type("outcome")
    assert any(fake_source in o.source_ids for o in outcomes)
