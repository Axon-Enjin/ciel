"""Pydantic models for PRD-F2 grant proposal generation.

A proposal is born from a *locked* ToC and matched to a funder profile. Every
section tracks provenance (`source_ids`) and whether a human has edited it, so
the AI never silently overwrites human text (PRD-F2 / US-02).
"""

from __future__ import annotations

from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Canonical, ordered section set for a Ciel proposal.
SECTION_SPEC: list[tuple[str, str]] = [
    ("executive_summary", "Executive Summary"),
    ("problem_statement", "Problem & Need"),
    ("theory_of_change", "Theory of Change"),
    ("activities_workplan", "Activities & Workplan"),
    ("outcomes_indicators", "Outcomes & Indicators"),
    ("budget_summary", "Budget Summary"),
    ("org_capacity", "Organizational Capacity"),
    ("funder_alignment", "Alignment with Funder Priorities"),
    ("compliance_checklist", "Compliance & Requirements"),
]


class FunderProfile(BaseModel):
    """The selected funder the proposal is matched to."""
    id: Optional[UUID] = None
    name: str
    type: str = Field(..., description="foundation | csr | government | multilateral")
    region: Optional[str] = None
    focus_areas: List[str] = Field(default_factory=list)
    kpis: List[str] = Field(default_factory=list)
    priorities: dict = Field(default_factory=dict)


class GrantSection(BaseModel):
    """One section of the proposal."""
    key: str = Field(..., description="Stable section key (see SECTION_SPEC)")
    heading: str
    content: str
    source_ids: List[str] = Field(
        default_factory=list,
        description="Evidence/ToC node ids backing this section. Empty = unverified.",
    )
    ai_generated: bool = True
    edited_by_human: bool = False


class FunderAlignment(BaseModel):
    """How the proposal maps to one of the funder's KPIs/requirements."""
    kpi: str
    addressed: bool
    note: str = ""


class GrantGenerationRequest(BaseModel):
    """Request to draft a funder-matched proposal from a locked ToC."""
    project_id: UUID
    org_id: UUID
    need: str = Field(..., min_length=3)
    org_name: str = "the organization"
    org_mission: Optional[str] = None
    funder: FunderProfile
    toc_graph: dict = Field(..., description="The locked ToC graph (nodes + edges)")
    assumptions: List[dict] = Field(default_factory=list)
    amount_php: Optional[float] = None
    # Optional: regenerate only a single section (key from SECTION_SPEC)
    only_section: Optional[str] = None


class GrantDraft(BaseModel):
    """Full structured draft returned by the pipeline."""
    sections: List[GrantSection]
    alignment: List[FunderAlignment] = Field(default_factory=list)
    tokens_used: int = 0
