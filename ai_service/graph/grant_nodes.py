"""Grant drafting logic (PRD-F2).

Stateless given the request: the caller (Next.js, with the user's RLS session)
supplies the locked ToC graph, assumptions, org, and funder profile. We draft
funder-matched, citation-grounded sections — using Foundry when credentials are
present, otherwise a deterministic template so the slice runs offline (mirrors
the ToC pipeline's fallback).
"""

from __future__ import annotations

import json
import logging
from typing import Any

from ai_service.config import settings
from ai_service.models.grant import (
    SECTION_SPEC,
    FunderAlignment,
    GrantGenerationRequest,
)

logger = logging.getLogger(__name__)

GRANT_SYSTEM_PROMPT = """You are Ciel's grant-writing engine for the social sector.
You turn a LOCKED Theory of Change into a funder-matched, compliance-ready proposal.
Rules:
- Ground every claim in the ToC nodes or evidence; cite by putting the relevant
  node/source ids in "source_ids". If a claim is not grounded, write it plainly and
  append "[UNVERIFIED - needs human input]".
- Match tone and emphasis to the funder's stated voice and priorities.
- Never invent budget figures, partners, or results.
Return ONLY valid JSON of shape:
{"sections":[{"key":"...","heading":"...","content":"...","source_ids":[]}]}
Use exactly these keys in order: """ + ", ".join(k for k, _ in SECTION_SPEC) + "."


def _nodes_by_type(graph: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for n in graph.get("nodes", []):
        out.setdefault(n.get("type", "other"), []).append(n)
    return out


def _ids(nodes: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for n in nodes:
        ids.extend(n.get("source_ids", []) or [])
    return list(dict.fromkeys(ids))  # de-dupe, keep order


def _php(n: float | None) -> str:
    if not n:
        return "to be finalized with the funder"
    return f"PHP {n:,.0f}"


def _template_sections(req: GrantGenerationRequest) -> list[dict[str, Any]]:
    g = _nodes_by_type(req.toc_graph)
    problem = g.get("problem", [])
    activities = g.get("activity", [])
    outputs = g.get("output", [])
    outcomes = g.get("outcome", [])
    impact = g.get("impact", [])
    funder = req.funder
    requires = funder.priorities.get("requires", []) if isinstance(funder.priorities, dict) else []
    voice = funder.priorities.get("voice", "") if isinstance(funder.priorities, dict) else ""

    problem_text = problem[0]["text"] if problem else req.need
    impact_text = impact[0]["text"] if impact else "lasting improvement in the target community"

    def bullets(nodes: list[dict[str, Any]]) -> str:
        return "\n".join(f"- {n.get('text','')}" for n in nodes) or "- (to be detailed)"

    content: dict[str, str] = {
        "executive_summary": (
            f"{req.org_name} requests the support of {funder.name} to address {req.need}. "
            f"Built on a locked, evidence-grounded Theory of Change, this program advances "
            f"{impact_text}. The approach is aligned to {funder.name}'s priorities"
            + (f" ({voice})" if voice else "")
            + "."
        ),
        "problem_statement": (
            f"{problem_text}\n\nThis proposal targets the root cause rather than its symptoms, "
            f"consistent with the evidence base assembled during Theory-of-Change design."
        ),
        "theory_of_change": (
            "If we invest the inputs below and deliver the activities, then we expect the "
            "following outputs, outcomes, and impact:\n\n"
            f"Activities:\n{bullets(activities)}\n\nOutputs:\n{bullets(outputs)}\n\n"
            f"Outcomes:\n{bullets(outcomes)}\n\nImpact:\n- {impact_text}"
        ),
        "activities_workplan": (
            f"Core activities and indicative sequencing:\n{bullets(activities)}\n\n"
            "A detailed workplan with milestones is maintained in the project workspace."
        ),
        "outcomes_indicators": (
            f"Measurable outcomes and the indicators Ciel will monitor:\n{bullets(outcomes)}\n\n"
            + (
                "Tracked assumptions & thresholds:\n"
                + "\n".join(
                    f"- {a.get('statement','')} (indicator: {a.get('indicator','')}, "
                    f"threshold: {a.get('threshold','—')})"
                    for a in req.assumptions
                )
                if req.assumptions
                else "Leading indicators will be finalized at project start."
            )
        ),
        "budget_summary": (
            f"Requested amount: {_php(req.amount_php)}. The budget funds the activities above and "
            f"the monitoring loop that reports outcomes against the Theory of Change. A full "
            f"line-item budget and procurement plan accompany this submission."
        ),
        "org_capacity": (
            f"{req.org_name}"
            + (f" — {req.org_mission}. " if req.org_mission else ". ")
            + "The organization brings local presence, community trust, and an evidence-first "
            "operating model through Ciel."
        ),
        "funder_alignment": (
            f"This program aligns with {funder.name}'s focus on "
            + (", ".join(funder.focus_areas) if funder.focus_areas else "social impact")
            + ". Reported metrics map to the funder's KPIs: "
            + (", ".join(funder.kpis) if funder.kpis else "impact and reach")
            + "."
        ),
        "compliance_checklist": (
            "Submission requirements addressed:\n"
            + ("\n".join(f"- {r}" for r in requires) if requires else "- Standard due-diligence package")
            + (
                "\n\nGovernment grants follow RA 12009 (NGPA): procurement plan, audit trail, "
                "and LGU endorsement are included."
                if funder.type == "government"
                else ""
            )
        ),
    }

    section_ids: dict[str, list[str]] = {
        "executive_summary": _ids(impact + outcomes),
        "problem_statement": _ids(problem),
        "theory_of_change": _ids(activities + outputs + outcomes + impact),
        "activities_workplan": _ids(activities + outputs),
        "outcomes_indicators": _ids(outcomes),
        "budget_summary": [],
        "org_capacity": [],
        "funder_alignment": _ids(outcomes + impact),
        "compliance_checklist": [],
    }

    sections = [
        {
            "key": key,
            "heading": heading,
            "content": content.get(key, ""),
            "source_ids": section_ids.get(key, []),
            "ai_generated": True,
            "edited_by_human": False,
        }
        for key, heading in SECTION_SPEC
    ]

    for section in sections:
        if not section["source_ids"] and "[UNVERIFIED" not in section["content"]:
            section["content"] = (
                section["content"].rstrip()
                + "\n\n[UNVERIFIED - needs human input]"
            )

    return sections


def build_alignment(req: GrantGenerationRequest, sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Heuristic KPI alignment panel — which funder KPIs the draft speaks to."""
    blob = " ".join(s.get("content", "") for s in sections).lower()
    alignment: list[FunderAlignment] = []
    for kpi in req.funder.kpis:
        tokens = [t for t in kpi.replace("_", " ").split() if len(t) > 3]
        hit = any(t in blob for t in tokens) if tokens else False
        alignment.append(
            FunderAlignment(
                kpi=kpi,
                addressed=hit or bool(req.assumptions),
                note="Reflected in Outcomes & Indicators" if hit else "Add explicit metric to strengthen",
            )
        )
    return [a.model_dump() for a in alignment]


async def draft_sections(req: GrantGenerationRequest) -> tuple[list[dict[str, Any]], int]:
    """Return (sections, tokens_used). Uses Foundry when available, else template."""
    tokens = 0
    sections: list[dict[str, Any]]

    if settings.ai_ready:
        try:
            from ai_service.services.foundry_client import foundry_client

            payload = {
                "need": req.need,
                "org": {"name": req.org_name, "mission": req.org_mission},
                "funder": req.funder.model_dump(mode="json"),
                "toc_graph": req.toc_graph,
                "assumptions": req.assumptions,
                "amount_php": req.amount_php,
                "only_section": req.only_section,
            }
            raw = await foundry_client.generate_grant(
                system_prompt=GRANT_SYSTEM_PROMPT,
                user_prompt=json.dumps(payload),
            )
            text = raw.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            parsed = json.loads(text)
            ai_sections = parsed.get("sections", [])
            heading_map = dict(SECTION_SPEC)
            sections = [
                {
                    "key": s.get("key", ""),
                    "heading": s.get("heading") or heading_map.get(s.get("key", ""), s.get("key", "")),
                    "content": s.get("content", ""),
                    "source_ids": s.get("source_ids", []) or [],
                    "ai_generated": True,
                    "edited_by_human": False,
                }
                for s in ai_sections
                if s.get("key") in heading_map
            ]
            tokens = settings.MAX_TOKENS_GRANT_SECTION
            if not sections:
                raise ValueError("empty AI sections")
        except Exception as exc:  # noqa: BLE001 - graceful degrade
            logger.warning("Foundry grant draft failed, using template: %s", exc)
            sections = _template_sections(req)
            tokens = 0
    else:
        sections = _template_sections(req)

    if req.only_section:
        sections = [s for s in sections if s["key"] == req.only_section]

    return sections, tokens
