"""QAD H-03 — grant proposal grounding and KPI alignment."""

import uuid

import pytest

from ai_service.graph.grant_nodes import build_alignment, draft_sections
from ai_service.models.grant import GrantGenerationRequest, SECTION_SPEC, FunderProfile


def _sample_request() -> GrantGenerationRequest:
    return GrantGenerationRequest(
        project_id=uuid.uuid4(),
        org_id=uuid.uuid4(),
        need="Youth in our barangay lack stable employment pathways after senior high school.",
        org_name="Demo NGO",
        funder=FunderProfile(
            name="Peace and Equity Foundation",
            type="foundation",
            kpis=["households_lifted", "jobs_created", "employment_rate"],
            focus_areas=["livelihood"],
        ),
        toc_graph={
            "nodes": [
                {
                    "id": "outcome-1",
                    "type": "outcome",
                    "text": "Youth show improved employment rates",
                    "source_ids": ["node-outcome-1"],
                },
                {
                    "id": "impact-1",
                    "type": "impact",
                    "text": "Sustained livelihood improvement",
                    "source_ids": [],
                },
            ],
            "edges": [],
        },
        assumptions=[
            {
                "statement": "Outcome holds",
                "indicator": "employment_rate",
                "threshold": 12.0,
            }
        ],
        amount_php=500_000,
    )


@pytest.mark.asyncio
async def test_template_grant_includes_all_section_keys():
    req = _sample_request()
    sections, _ = await draft_sections(req)
    keys = {s["key"] for s in sections}
    expected = {k for k, _ in SECTION_SPEC}
    assert keys == expected


@pytest.mark.asyncio
async def test_grant_sections_grounded_or_flagged():
    req = _sample_request()
    sections, _ = await draft_sections(req)
    for section in sections:
        grounded = bool(section.get("source_ids")) or "[UNVERIFIED" in section.get(
            "content", ""
        )
        assert grounded, f"Section {section['key']} not grounded: {section.get('content','')[:80]}"


@pytest.mark.asyncio
async def test_build_alignment_marks_kpis_when_content_matches():
    req = _sample_request()
    sections, _ = await draft_sections(req)
    alignment = build_alignment(req, sections)
    assert len(alignment) == len(req.funder.kpis)
    assert any(a["addressed"] for a in alignment)
