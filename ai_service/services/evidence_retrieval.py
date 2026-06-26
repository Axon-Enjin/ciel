"""
Evidence retrieval service using pgvector for semantic search.

Implements RAG retrieval for grounding ToC generation with development evidence.
Uses OpenAI embeddings via Microsoft Foundry for semantic similarity.
"""

from typing import List, Dict, Any, Optional, Literal
import logging
from openai import AzureOpenAI

from ai_service.config import settings
from ai_service.services.supabase_client import supabase_client
from ai_service.models.evidence import EvidenceChunk, EvidenceSource

logger = logging.getLogger(__name__)


class EvidenceRetriever:
    """
    RAG retrieval service for evidence corpus.
    
    Uses pgvector for semantic search with OpenAI embeddings.
    Implements tier-aware retrieval per SDD §8.2.
    """
    
    def __init__(self):
        """Defer embedding-client creation until first use.

        Building the Azure OpenAI client is delayed so importing this module
        never requires Foundry credentials. When credentials are absent,
        retrieval skips embeddings entirely (see ``retrieve_evidence``) rather
        than issuing doomed network calls.
        """
        self._embedding_client: Optional[AzureOpenAI] = None
        self.embedding_model = settings.EMBEDDING_MODEL
        self.embedding_dimensions = settings.EMBEDDING_DIMENSIONS

    @property
    def embedding_client(self) -> AzureOpenAI:
        """Lazily construct the embedding client on the Foundry resource."""
        if self._embedding_client is None:
            self._embedding_client = AzureOpenAI(
                azure_endpoint=settings.FOUNDRY_ENDPOINT,
                api_key=settings.FOUNDRY_API_KEY,
                api_version=settings.FOUNDRY_API_VERSION,
                timeout=settings.EMBEDDING_TIMEOUT_SECONDS,
                max_retries=settings.EMBEDDING_MAX_RETRIES,
            )
        return self._embedding_client
    
    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.
        
        Args:
            text: Input text to embed
            
        Returns:
            Embedding vector (1536 dimensions)
        """
        try:
            response = self.embedding_client.embeddings.create(
                model=self.embedding_model,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    def retrieve_evidence(
        self,
        query: str,
        top_k: int = 5,
        tier_filter: Optional[List[Literal["T1", "T2", "T3", "T4"]]] = None,
        min_relevance: float = 0.7,
    ) -> List[EvidenceChunk]:
        """
        Retrieve relevant evidence chunks using semantic search.
        
        Args:
            query: Search query (e.g., "What interventions reduce child malnutrition?")
            top_k: Number of results to return
            tier_filter: Filter by evidence tiers (e.g., ["T1", "T2"] for high-quality only)
            min_relevance: Minimum cosine similarity threshold (0-1)
            
        Returns:
            List of evidence chunks with relevance scores and citations
        """
        # Without Foundry credentials, embeddings would only ever fail/retry.
        # Skip straight to keyword search to keep the offline path fast & quiet.
        if not settings.ai_ready:
            logger.info(
                "AI credentials absent; using keyword search instead of embeddings."
            )
            return self._fallback_keyword_search(query, top_k, tier_filter)

        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Build pgvector similarity search query
            # Using cosine similarity: 1 - (embedding <=> query_embedding)
            client = supabase_client.client
            
            # Base query with vector search
            rpc_params = {
                "query_embedding": query_embedding,
                "match_threshold": min_relevance,
                "match_count": top_k,
            }
            
            # Add tier filter if specified
            if tier_filter:
                rpc_params["tier_filter"] = tier_filter
            
            # Execute RPC function for vector search
            # Note: This assumes a Postgres function `match_evidence_sources` exists
            # We'll create this in a migration update
            result = client.rpc("match_evidence_sources", rpc_params).execute()
            
            # Convert to EvidenceChunk models
            chunks = []
            for row in result.data:
                # Generate citation from source metadata
                citation = self._format_citation(row)
                
                chunk = EvidenceChunk(
                    source_id=row["id"],
                    chunk_text=row["chunk"],
                    tier=row["tier"],
                    relevance_score=row["similarity"],
                    citation=citation,
                )
                chunks.append(chunk)
            
            logger.info(
                f"Retrieved {len(chunks)} evidence chunks for query: {query[:50]}..."
            )
            return chunks
            
        except Exception as e:
            logger.error(f"Evidence retrieval failed: {e}")
            # Fallback to keyword search if vector search fails
            return self._fallback_keyword_search(query, top_k, tier_filter)
    
    def _format_citation(self, row: Dict[str, Any]) -> str:
        """
        Format a citation string from database row.
        
        Args:
            row: Database row with title, metadata, url
            
        Returns:
            Formatted citation string
        """
        parts = [row["title"]]
        
        metadata = row.get("metadata", {})
        if metadata:
            if "author" in metadata:
                parts.insert(0, metadata["author"])
            if "year" in metadata:
                parts.append(f"({metadata['year']})")
        
        if row.get("url"):
            parts.append(row["url"])
        
        return ". ".join(parts)
    
    def _fallback_keyword_search(
        self,
        query: str,
        top_k: int,
        tier_filter: Optional[List[Literal["T1", "T2", "T3", "T4"]]] = None,
    ) -> List[EvidenceChunk]:
        """
        Fallback to keyword-based search if vector search fails.
        
        Args:
            query: Search query
            top_k: Number of results
            tier_filter: Evidence tier filter
            
        Returns:
            List of evidence chunks from keyword search
        """
        try:
            logger.warning("Using fallback keyword search")
            
            client = supabase_client.client
            query_builder = (
                client.table("evidence_sources")
                .select("*")
                .or_(f"title.ilike.%{query}%,chunk.ilike.%{query}%")
            )
            
            if tier_filter:
                query_builder = query_builder.in_("tier", tier_filter)
            
            result = query_builder.limit(top_k).execute()
            
            # Convert to EvidenceChunk with default relevance
            chunks = []
            for row in result.data:
                citation = self._format_citation(row)
                
                chunk = EvidenceChunk(
                    source_id=row["id"],
                    chunk_text=row["chunk"],
                    tier=row["tier"],
                    relevance_score=0.5,  # Default score for keyword match
                    citation=citation,
                )
                chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            # No DB (e.g. placeholder creds in local/dev) is an expected,
            # non-fatal state — log softly and return an empty corpus so the
            # pipeline grounds via the [UNVERIFIED] flag instead of crashing.
            logger.info("Keyword search unavailable, continuing without evidence: %s", e)
            return []
    
    def retrieve_by_ids(self, source_ids: List[str]) -> List[EvidenceChunk]:
        """
        Retrieve specific evidence sources by IDs.
        
        Used for displaying citations and provenance.
        
        Args:
            source_ids: List of evidence source UUIDs
            
        Returns:
            List of evidence chunks
        """
        try:
            client = supabase_client.client
            result = (
                client.table("evidence_sources")
                .select("*")
                .in_("id", source_ids)
                .execute()
            )
            
            chunks = []
            for row in result.data:
                citation = self._format_citation(row)
                
                chunk = EvidenceChunk(
                    source_id=row["id"],
                    chunk_text=row["chunk"],
                    tier=row["tier"],
                    relevance_score=1.0,  # Direct retrieval, full relevance
                    citation=citation,
                )
                chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to retrieve evidence by IDs: {e}")
            return []
    
    def seed_evidence_corpus(
        self,
        sources: List[Dict[str, Any]],
        generate_embeddings: bool = True,
    ) -> List[str]:
        """
        Seed the evidence corpus with initial sources.
        
        Args:
            sources: List of evidence source data (title, chunk, tier, metadata, url)
            generate_embeddings: Whether to generate embeddings for sources
            
        Returns:
            List of inserted source IDs
        """
        try:
            # Generate embeddings if requested
            if generate_embeddings:
                for source in sources:
                    # Combine title and chunk for embedding
                    text = f"{source['title']}\n\n{source['chunk']}"
                    embedding = self._generate_embedding(text)
                    source["embedding"] = embedding
            
            # Bulk insert
            inserted = supabase_client.bulk_insert_evidence_sources(sources)
            source_ids = [s["id"] for s in inserted]
            
            logger.info(f"Seeded {len(source_ids)} evidence sources")
            return source_ids
            
        except Exception as e:
            logger.error(f"Failed to seed evidence corpus: {e}")
            raise
    
    def get_corpus_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the evidence corpus.
        
        Returns:
            Dictionary with corpus statistics (total, by tier, etc.)
        """
        try:
            client = supabase_client.client
            
            # Total count
            total_result = client.table("evidence_sources").select("id", count="exact").execute()
            total = total_result.count
            
            # Count by tier
            tier_counts = {}
            for tier in ["T1", "T2", "T3", "T4"]:
                tier_result = (
                    client.table("evidence_sources")
                    .select("id", count="exact")
                    .eq("tier", tier)
                    .execute()
                )
                tier_counts[tier] = tier_result.count
            
            return {
                "total_sources": total,
                "by_tier": tier_counts,
            }
            
        except Exception as e:
            logger.error(f"Failed to get corpus stats: {e}")
            return {"total_sources": 0, "by_tier": {}}


# Global instance
evidence_retriever = EvidenceRetriever()

# Made with Bob
