"""LangGraph nodes for ToC generation pipeline."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from ai_service.config import settings
from ai_service.graph.state import TocState
from ai_service.models.toc import TocGraph, TocNode, TocEdge

logger = logging.getLogger(__name__)

NODE_TYPE_ORDER = ("problem", "input", "activity", "output", "outcome", "impact")

INTERROGATE_SYSTEM_PROMPT = """You are Ciel's root-cause analyst for social sector programs.
Return ONLY valid JSON: {"questions": ["...", "..."]}
Ask 2-3 plain, kind clarifying questions about root causes — no jargon, no "AI" framing."""

TOC_SYSTEM_PROMPT = """You are Ciel's Theory of Change generator for the social sector.
Return ONLY valid JSON with this shape:
{
  "nodes": [{"id":"...", "type":"problem|input|activity|output|outcome|impact", "text":"...", "source_ids":[]}],
  "edges": [{"from_node":"...", "to_node":"...", "relationship":"leads_to"}]
}
Ground outcomes and impacts with source_ids from evidence. Mark ungrounded claims in text with [UNVERIFIED - needs human input]."""


def _template_graph(need: str, source_ids: list[str]) -> dict[str, Any]:
    """Deterministic fallback when AI credentials are unavailable."""
    sid = source_ids[0] if source_ids else ""
    sources = [sid] if sid else []
    nodes = [
        TocNode(id="problem-1", type="problem", text=need, source_ids=[]),
        TocNode(
            id="input-1",
            type="input",
            text="Community partners, frontline staff time, and seed funding",
            source_ids=[],
        ),
        TocNode(
            id="activity-1",
            type="activity",
            text="Deliver evidence-backed program activities aligned to root causes",
            source_ids=sources,
        ),
        TocNode(
            id="output-1",
            type="output",
            text="Participants complete core program milestones",
            source_ids=sources,
        ),
        TocNode(
            id="outcome-1",
            type="outcome",
            text="Target population shows measurable improvement on leading indicators",
            source_ids=sources,
        ),
        TocNode(
            id="impact-1",
            type="impact",
            text="Sustained improvement in the social outcome the program addresses",
            source_ids=sources,
        ),
    ]
    edges = [
        TocEdge(from_node="problem-1", to_node="input-1"),
        TocEdge(from_node="input-1", to_node="activity-1"),
        TocEdge(from_node="activity-1", to_node="output-1"),
        TocEdge(from_node="output-1", to_node="outcome-1"),
        TocEdge(from_node="outcome-1", to_node="impact-1"),
    ]
    graph = TocGraph(nodes=nodes, edges=edges)
    return graph.model_dump()


def _template_critiques(need: str, source_ids: list[str]) -> list[dict[str, Any]]:
    return [
        {
            "prompt": (
                "Similar pilots in comparable contexts often fail when attendance "
                "drops below 12 participants per session for three consecutive weeks — "
                "worth planning a contingency before you lock this ToC."
            ),
            "source_ids": source_ids[:1],
            "severity": "high",
            "category": "assumption_breach",
        },
        {
            "prompt": (
                "No close precedent was found for every element of this need — proceed "
                "with caution and validate assumptions with local stakeholders before scaling."
            ),
            "source_ids": [],
            "severity": "medium",
            "category": "context_mismatch",
        },
    ]


def _extract_assumptions(graph: dict[str, Any]) -> list[dict[str, Any]]:
    assumptions: list[dict[str, Any]] = []
    for node in graph.get("nodes", []):
        if node.get("type") == "outcome":
            assumptions.append(
                {
                    "statement": f"Outcome holds: {node.get('text', '')}",
                    "indicator": "leading_outcome_rate",
                    "threshold": 12.0,
                }
            )
    if not assumptions:
        assumptions.append(
            {
                "statement": "Core program activities reach intended participants",
                "indicator": "attendance_per_session",
                "threshold": 12.0,
            }
        )
    return assumptions


def _template_interrogation(need: str, context: dict[str, Any]) -> list[str]:
    """Deterministic root-cause questions when AI is unavailable."""
    region = context.get("region") or "this context"
    population = context.get("population") or "the target population"
    snippet = need[:120].rstrip()
    if len(need) > 120:
        snippet += "…"
    return [
        f"What upstream factors most often prevent {population} from resolving: “{snippet}”?",
        f"In {region}, which local constraints (access, cost, trust) have blocked similar efforts before?",
        "Who on the frontline would notice early if this approach is not working — and how would they tell you?",
    ]


async def interrogate_node(state: TocState) -> TocState:
    state["current_node"] = "interrogate"
    need = state.get("need", "")
    context = state.get("context", {})
    questions: list[str] = []
    tokens = 0

    if settings.ai_ready:
        try:
            from ai_service.services.foundry_client import foundry_client

            user_prompt = json.dumps({"need": need, "context": context})
            raw = await foundry_client.generate_interrogation(
                system_prompt=INTERROGATE_SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
            if isinstance(raw, str):
                text = raw.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                parsed = json.loads(text)
                questions = [str(q) for q in parsed.get("questions", []) if q][:3]
                tokens = 1500
        except Exception as exc:
            logger.warning("Interrogation generation failed, using template: %s", exc)

    if not questions:
        questions = _template_interrogation(need, context)

    state["interrogation_questions"] = questions
    state["tokens_used"] = state.get("tokens_used", 0) + tokens
    return state


async def retrieve_node(state: TocState) -> TocState:
    state["current_node"] = "retrieve"
    need = state.get("need", "")
    evidence: list[dict[str, Any]] = []

    try:
        from ai_service.services.evidence_retrieval import evidence_retriever

        chunks = evidence_retriever.retrieve_evidence(need, top_k=5, min_relevance=0.5)
        evidence = [
            {
                "source_id": str(c.source_id),
                "chunk_text": c.chunk_text,
                "tier": c.tier,
                "citation": c.citation,
                "relevance_score": c.relevance_score,
            }
            for c in chunks
        ]
    except Exception as exc:
        logger.warning("Evidence retrieval failed, continuing with empty corpus: %s", exc)

    state["retrieved_evidence"] = evidence
    return state


async def draft_node(state: TocState) -> TocState:
    state["current_node"] = "draft"
    need = state.get("need", "")
    context = state.get("context", {})
    evidence = state.get("retrieved_evidence", [])
    source_ids = [e["source_id"] for e in evidence if e.get("source_id")]
    evidence_context = "\n\n".join(
        f"- [{e.get('source_id', 'unknown')}] {e.get('chunk_text', '')[:500]}"
        for e in evidence
    ) or "No evidence retrieved."

    tokens = 0
    graph_dict: dict[str, Any]

    if settings.ai_ready:
        try:
            from ai_service.services.foundry_client import foundry_client

            user_prompt = json.dumps({"need": need, "context": context})
            raw = await foundry_client.generate_toc(
                system_prompt=TOC_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                evidence_context=evidence_context,
                stream=False,
            )
            if isinstance(raw, str):
                text = raw.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                graph_dict = json.loads(text)
                tokens = 8000
        except Exception as exc:
            logger.warning("Foundry draft failed, using template: %s", exc)
            graph_dict = _template_graph(need, source_ids)
            tokens = 0
    else:
        graph_dict = _template_graph(need, source_ids)

    # Validate through Pydantic (applies grounding flags)
    validated = TocGraph.model_validate(graph_dict)
    state["draft_graph"] = validated.model_dump()
    state["assumptions"] = _extract_assumptions(state["draft_graph"])
    state["tokens_used"] = state.get("tokens_used", 0) + tokens
    return state


async def critique_node(state: TocState) -> TocState:
    state["current_node"] = "critique"
    if not settings.ENABLE_TOC_CRITIQUE:
        state["critiques"] = []
        return state

    need = state.get("need", "")
    graph = state.get("draft_graph", {})
    evidence = state.get("retrieved_evidence", [])
    source_ids = [e["source_id"] for e in evidence if e.get("source_id")]

    critiques: list[dict[str, Any]] = []
    tokens = 0

    if settings.ai_ready:
        try:
            from ai_service.services.foundry_client import foundry_client

            evidence_context = "\n".join(e.get("citation", "") for e in evidence)
            raw_critique = await foundry_client.generate_critique(
                toc_content=json.dumps(graph),
                evidence_context=evidence_context,
            )
            critiques = [
                {
                    "prompt": raw_critique[:2000],
                    "source_ids": source_ids[:2],
                    "severity": "high",
                    "category": "logic_gap",
                }
            ]
            tokens = 2000
        except Exception as exc:
            logger.warning("Critique generation failed, using template: %s", exc)
            critiques = _template_critiques(need, source_ids)
    else:
        critiques = _template_critiques(need, source_ids)

    state["critiques"] = critiques
    state["tokens_used"] = state.get("tokens_used", 0) + tokens
    return state
