"""LangGraph state for ToC generation (RFC-001)."""

from typing import Any, TypedDict


class TocState(TypedDict, total=False):
    project_id: str
    org_id: str
    need: str
    context: dict[str, Any]
    retrieved_evidence: list[dict[str, Any]]
    draft_graph: dict[str, Any]
    critiques: list[dict[str, Any]]
    assumptions: list[dict[str, Any]]
    interrogation_questions: list[str]
    toc_id: str
    tokens_used: int
    current_node: str
