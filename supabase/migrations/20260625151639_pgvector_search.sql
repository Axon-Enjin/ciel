-- Migration: Add pgvector search function for evidence retrieval
-- Date: 2026-06-25
-- Description: Creates RPC function for semantic similarity search using pgvector

-- Create function for matching evidence sources by embedding similarity
CREATE OR REPLACE FUNCTION match_evidence_sources(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  tier_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  url text,
  tier text,
  chunk text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    evidence_sources.id,
    evidence_sources.title,
    evidence_sources.url,
    evidence_sources.tier,
    evidence_sources.chunk,
    evidence_sources.embedding,
    evidence_sources.metadata,
    evidence_sources.created_at,
    1 - (evidence_sources.embedding <=> query_embedding) AS similarity
  FROM evidence_sources
  WHERE 
    (tier_filter IS NULL OR evidence_sources.tier = ANY(tier_filter))
    AND (1 - (evidence_sources.embedding <=> query_embedding)) >= match_threshold
  ORDER BY evidence_sources.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_evidence_sources IS 
'Semantic search for evidence sources using cosine similarity. Returns sources above threshold, ordered by relevance.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_evidence_sources TO authenticated;
GRANT EXECUTE ON FUNCTION match_evidence_sources TO service_role;