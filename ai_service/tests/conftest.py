"""Pytest configuration for ai_service."""

import pytest


@pytest.fixture
def sample_need() -> str:
    return (
        "Youth in our barangay lack stable employment pathways after senior high school "
        "and need skills training connected to local employers."
    )
