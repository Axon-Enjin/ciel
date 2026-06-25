"""
Evidence Source Data Models
Pydantic schemas for the RAG evidence corpus
Date: 2026-06-25
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from uuid import UUID
from datetime import datetime


class EvidenceTier(str):
    """
    Evidence tier classification per SDD §3.
    
    T1: Systematic reviews, meta-analyses
    T2: Randomized controlled trials
    T3: Observational studies, case studies
    T4: Expert opinion, grey literature
    """
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"
    T4 = "T4"


class EvidenceSource(BaseModel):
    """
    A single evidence source in the RAG corpus.
    
    Stored in the evidence_sources table with pgvector embeddings.
    """
    id: Optional[UUID] = None
    title: str = Field(..., description="Source title")
    url: Optional[HttpUrl] = Field(None, description="Source URL if available")
    tier: Literal["T1", "T2", "T3", "T4"] = Field(
        ..., description="Evidence quality tier"
    )
    chunk: str = Field(..., description="Text chunk for retrieval")
    embedding: Optional[List[float]] = Field(
        None, description="Vector embedding (1536 dimensions)"
    )
    metadata: Optional[dict] = Field(
        default_factory=dict,
        description="Additional metadata (author, year, domain, etc.)"
    )
    created_at: Optional[datetime] = None
    
    def get_citation(self) -> str:
        """Generate a citation string for this source."""
        parts = [self.title]
        if self.metadata:
            if "author" in self.metadata:
                parts.insert(0, self.metadata["author"])
            if "year" in self.metadata:
                parts.append(f"({self.metadata['year']})")
        if self.url:
            parts.append(str(self.url))
        return ". ".join(parts)


class EvidenceRetrievalRequest(BaseModel):
    """Request to retrieve relevant evidence."""
    query: str = Field(..., min_length=10, description="Search query")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results")
    tier_filter: Optional[List[Literal["T1", "T2", "T3", "T4"]]] = Field(
        None, description="Filter by evidence tiers"
    )
    domain_filter: Optional[List[str]] = Field(
        None, description="Filter by domain (e.g., 'education', 'health')"
    )


class EvidenceRetrievalResponse(BaseModel):
    """Response from evidence retrieval."""
    sources: List[EvidenceSource] = Field(..., description="Retrieved sources")
    query: str = Field(..., description="Original query")
    total_found: int = Field(..., description="Total matching sources")
    retrieval_time_ms: int = Field(..., description="Retrieval time in milliseconds")


class EvidenceChunk(BaseModel):
    """
    A chunk of evidence with relevance score.
    
    Used during ToC generation to track which sources support which claims.
    """
    source_id: UUID = Field(..., description="Evidence source UUID")
    chunk_text: str = Field(..., description="The relevant text chunk")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Similarity score")
    tier: Literal["T1", "T2", "T3", "T4"] = Field(..., description="Evidence tier")
    citation: str = Field(..., description="Formatted citation")


class EvidenceSeedRequest(BaseModel):
    """Request to seed evidence corpus."""
    sources: List[EvidenceSource] = Field(..., description="Sources to add")
    generate_embeddings: bool = Field(
        default=True,
        description="Whether to generate embeddings (requires API call)"
    )


class EvidenceSeedResponse(BaseModel):
    """Response from seeding evidence corpus."""
    sources_added: int = Field(..., description="Number of sources added")
    embeddings_generated: int = Field(..., description="Number of embeddings generated")
    errors: List[str] = Field(default_factory=list, description="Any errors encountered")

# Made with Bob
