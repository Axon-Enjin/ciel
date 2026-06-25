"""QAD H-02 — lock requires failure prompt acknowledgment."""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from ai_service.main import app

TOC_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())
CRITIQUE_A = str(uuid.uuid4())
CRITIQUE_B = str(uuid.uuid4())


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_supabase_blocked():
    toc_record = {
        "id": TOC_ID,
        "project_id": PROJECT_ID,
        "version": 1,
        "graph": {
            "nodes": [
                {
                    "id": "outcome-1",
                    "type": "outcome",
                    "text": "Youth show improved employment rates",
                    "source_ids": [],
                }
            ],
            "edges": [],
        },
        "status": "draft",
        "failure_prompts_ack": False,
    }
    critiques = [
        {"id": CRITIQUE_A, "toc_id": TOC_ID, "prompt": "Risk A", "acknowledged": False},
        {"id": CRITIQUE_B, "toc_id": TOC_ID, "prompt": "Risk B", "acknowledged": False},
    ]

    mock = MagicMock()
    mock.get_toc.return_value = toc_record
    mock.get_toc_critiques.side_effect = [
        critiques,
        [
            {**critiques[0], "acknowledged": True},
            {**critiques[1], "acknowledged": False},
        ],
    ]
    mock.acknowledge_critique_simple.return_value = {}
    return mock


@pytest.fixture
def mock_supabase_success():
    toc_record = {
        "id": TOC_ID,
        "project_id": PROJECT_ID,
        "version": 1,
        "graph": {
            "nodes": [
                {
                    "id": "outcome-1",
                    "type": "outcome",
                    "text": "Youth show improved employment rates",
                    "source_ids": [],
                }
            ],
            "edges": [],
        },
        "status": "draft",
        "failure_prompts_ack": False,
    }
    critiques = [
        {"id": CRITIQUE_A, "toc_id": TOC_ID, "prompt": "Risk A", "acknowledged": False},
        {"id": CRITIQUE_B, "toc_id": TOC_ID, "prompt": "Risk B", "acknowledged": False},
    ]

    mock = MagicMock()
    mock.get_toc.return_value = toc_record
    mock.get_toc_critiques.side_effect = [
        critiques,
        [
            {**critiques[0], "acknowledged": True},
            {**critiques[1], "acknowledged": True},
        ],
    ]
    mock.acknowledge_critique_simple.return_value = {}
    mock.insert_toc_assumptions.return_value = [
        {
            "id": str(uuid.uuid4()),
            "toc_id": TOC_ID,
            "statement": "Outcome holds",
            "indicator": "leading_outcome_rate",
            "threshold": 12.0,
        }
    ]
    mock.update_toc.return_value = {**toc_record, "status": "locked"}
    return mock


def test_lock_blocked_until_all_critiques_acknowledged(client, mock_supabase_blocked):
    with patch("ai_service.routers.toc.supabase_client", mock_supabase_blocked):
        res = client.post(
            f"/toc/{TOC_ID}/lock",
            json={
                "toc_id": TOC_ID,
                "acknowledged_critique_ids": [CRITIQUE_A],
            },
        )
    assert res.status_code == 409
    assert "acknowledged" in res.json()["detail"].lower()


def test_lock_succeeds_when_all_critiques_acknowledged(client, mock_supabase_success):
    with patch("ai_service.routers.toc.supabase_client", mock_supabase_success):
        res = client.post(
            f"/toc/{TOC_ID}/lock",
            json={
                "toc_id": TOC_ID,
                "acknowledged_critique_ids": [CRITIQUE_A, CRITIQUE_B],
            },
        )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "locked"
    assert len(body["assumptions"]) >= 1
