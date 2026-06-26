"""Unit tests for AI-readiness gating and graceful degradation.

These cover the offline/no-credentials path that keeps the service fast and
quiet when Foundry is not configured (config.ai_ready), and verify the health
and readiness endpoints behave correctly in that state.
"""

from unittest.mock import patch, PropertyMock

import pytest
from fastapi.testclient import TestClient

from ai_service.config import Settings, settings
from ai_service.main import app
from ai_service.services.evidence_retrieval import evidence_retriever


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.parametrize(
    "key,expected",
    [
        ("", False),
        ("your_foundry_api_key_here", False),
        ("your_foundry_key", False),
        ("   ", False),
        ("sk-real-key", True),
    ],
)
def test_ai_ready_detects_placeholder_keys(key: str, expected: bool):
    assert Settings(FOUNDRY_API_KEY=key).ai_ready is expected


def test_retrieval_skips_embeddings_when_not_ready():
    """Without credentials, retrieve_evidence must not call the embedding API."""
    # Force the unconfigured state so the test is hermetic regardless of whether
    # a real FOUNDRY_API_KEY happens to be present in the local .env.
    with patch.object(
        type(settings), "ai_ready", new_callable=PropertyMock, return_value=False
    ), patch.object(
        evidence_retriever, "_generate_embedding"
    ) as mock_embed, patch.object(
        evidence_retriever, "_fallback_keyword_search", return_value=[]
    ) as mock_fallback:
        result = evidence_retriever.retrieve_evidence("youth employment", top_k=3)

    mock_embed.assert_not_called()
    mock_fallback.assert_called_once()
    assert result == []


def test_keyword_search_returns_empty_without_db():
    """Keyword fallback degrades to an empty corpus when the DB is unavailable."""
    # Default test settings point at a placeholder Supabase that rejects the key,
    # so the fallback should swallow the error and return [].
    assert evidence_retriever._fallback_keyword_search("anything", top_k=3) == []


def test_health_endpoint_ok(client):
    res = client.get("/health/")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"


def test_readiness_reports_ai_not_configured_without_probe(client):
    """When AI is unconfigured, readiness must not probe Foundry."""
    with patch.object(
        type(settings), "ai_ready", new_callable=PropertyMock, return_value=False
    ), patch("ai_service.services.foundry_client.foundry_client.health_check") as probe:
        res = client.get("/health/ready")

    assert res.status_code == 200
    checks = res.json()["checks"]
    assert checks["ai_configured"] is False
    assert checks["foundry_accessible"] is None
    probe.assert_not_called()
