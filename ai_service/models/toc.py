"""
Theory of Change Data Models
Pydantic schemas for ToC structures with grounding rules
Date: 2026-06-25
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from uuid import UUID
from datetime import datetime


class TocNode(BaseModel):
    """
    A single node in the Theory of Change graph.
    
    Each node represents a component: problem, input, activity, output, outcome, or impact.
    Every claim must be grounded in evidence or explicitly flagged as unverified.
    """
    id: str = Field(..., description="Unique identifier for this node")
    type: Literal["problem", "input", "activity", "output", "outcome", "impact"] = Field(
        ..., description="Type of ToC component"
    )
    text: str = Field(..., description="The claim or statement")
    source_ids: List[str] = Field(
        default_factory=list,
        description="Evidence source UUIDs backing this claim. Empty = unverified."
    )
    confidence: Optional[float] = Field(
        None, ge=0.0, le=1.0,
        description="Confidence score (0-1) if applicable"
    )
    
    @field_validator("text")
    @classmethod
    def ensure_grounded_or_flagged(cls, v: str, info) -> str:
        """
        Critical grounding rule (SDD §8.1):
        If no sources, prepend unverified flag.
        """
        source_ids = info.data.get("source_ids", [])
        if not source_ids and not v.startswith("[UNVERIFIED"):
            return f"[UNVERIFIED - needs human input] {v}"
        return v


class TocEdge(BaseModel):
    """An edge connecting two nodes in the ToC graph."""
    from_node: str = Field(..., description="Source node ID")
    to_node: str = Field(..., description="Target node ID")
    relationship: str = Field(
        default="leads_to",
        description="Type of relationship (leads_to, requires, enables)"
    )


class TocGraph(BaseModel):
    """
    Complete Theory of Change graph structure.
    
    Represents the full logic model from problem to impact.
    """
    nodes: List[TocNode] = Field(..., description="All nodes in the ToC")
    edges: List[TocEdge] = Field(..., description="Connections between nodes")
    metadata: Optional[dict] = Field(
        default_factory=dict,
        description="Additional metadata (context, assumptions, etc.)"
    )
    
    def get_node(self, node_id: str) -> Optional[TocNode]:
        """Get a node by ID."""
        return next((n for n in self.nodes if n.id == node_id), None)
    
    def get_nodes_by_type(self, node_type: str) -> List[TocNode]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes if n.type == node_type]
    
    def count_unverified(self) -> int:
        """Count nodes with no evidence sources."""
        return sum(1 for n in self.nodes if not n.source_ids)


class TocAssumption(BaseModel):
    """
    A measurable assumption extracted from the ToC.
    
    These are what the M&E system monitors (RFC-002).
    """
    id: Optional[UUID] = None
    toc_id: Optional[UUID] = None
    statement: str = Field(..., description="The assumption statement")
    indicator: str = Field(..., description="Measurable indicator name")
    threshold: Optional[float] = Field(
        None, description="Threshold value that triggers a signal"
    )
    node_ids: List[str] = Field(
        default_factory=list,
        description="ToC node IDs this assumption relates to"
    )


class TocGenerationRequest(BaseModel):
    """Request to generate a Theory of Change."""
    project_id: UUID = Field(..., description="Project UUID")
    need: str = Field(..., min_length=10, description="Plain-language social need")
    context: dict = Field(
        default_factory=dict,
        description="Additional context (region, population, etc.)"
    )
    org_id: UUID = Field(..., description="Organization UUID for RLS")


class TocGenerationResponse(BaseModel):
    """Response from ToC generation."""
    toc_id: UUID = Field(..., description="Generated ToC UUID")
    version: int = Field(..., description="ToC version number")
    graph: TocGraph = Field(..., description="The generated ToC graph")
    assumptions: List[TocAssumption] = Field(
        default_factory=list,
        description="Extracted measurable assumptions"
    )
    tokens_used: int = Field(..., description="Total tokens consumed")
    generation_time_ms: int = Field(..., description="Generation time in milliseconds")


class TocLockRequest(BaseModel):
    """Request to lock a ToC after acknowledging failure prompts."""
    toc_id: UUID = Field(..., description="ToC UUID to lock")
    acknowledged_critique_ids: List[UUID] = Field(
        ..., description="Critique IDs that were acknowledged"
    )


class TocLockResponse(BaseModel):
    """Response from locking a ToC."""
    toc_id: UUID
    status: Literal["locked"]
    version: int
    assumptions: List[TocAssumption] = Field(
        ..., description="Final extracted assumptions for M&E"
    )
    locked_at: datetime

# Made with Bob
