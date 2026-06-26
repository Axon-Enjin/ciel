"""Pytest configuration for ai_service."""

import pytest

from ai_service.config import settings


@pytest.fixture(autouse=True)
def _hermetic_offline_env(monkeypatch):
    """Force the offline/no-credentials state for every test.

    Tests must not depend on a developer's local ``ai_service/.env`` (which may
    carry real Foundry/Supabase credentials). Blank the Foundry key so
    ``settings.ai_ready`` is False, and reset the lazily-built singleton clients
    so they can't leak a client constructed against real settings. Tests that
    need credentials construct their own ``Settings(...)`` explicitly.
    """
    monkeypatch.setattr(settings, "FOUNDRY_API_KEY", "", raising=False)

    from ai_service.services.evidence_retrieval import evidence_retriever
    from ai_service.services.foundry_client import foundry_client
    from ai_service.services.supabase_client import supabase_client

    foundry_client._client = None
    evidence_retriever._embedding_client = None
    supabase_client._client = None
    yield


@pytest.fixture
def sample_need() -> str:
    return (
        "Youth in our barangay lack stable employment pathways after senior high school "
        "and need skills training connected to local employers."
    )
