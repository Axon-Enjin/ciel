#!/usr/bin/env python3
"""
Seed M&E demo data for a project with a locked ToC.

Inserts three attendance indicator points below threshold and runs signal evaluation
so the project dashboard shows an ADAPT signal.

Usage:
  python scripts/seed_mande_demo.py
  python scripts/seed_mande_demo.py --project-id <uuid>
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

INDICATOR = "attendance_per_session"
DEMO_VALUES = [9.0, 9.5, 9.2]


def find_demo_project(client, project_id: str | None) -> dict | None:
    if project_id:
        row = (
            client.table("projects")
            .select("id, need")
            .eq("id", project_id)
            .maybe_single()
            .execute()
        )
        return row.data

    locked = (
        client.table("theories_of_change")
        .select("project_id, id")
        .eq("status", "locked")
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    if not locked.data:
        return None
    toc = locked.data[0]
    proj = (
        client.table("projects")
        .select("id, need")
        .eq("id", toc["project_id"])
        .maybe_single()
        .execute()
    )
    return proj.data


def seed_points(client, project_id: str, assumption_id: str | None) -> int:
    now = datetime.now(timezone.utc)
    inserted = 0
    for i, value in enumerate(DEMO_VALUES):
        observed = (now - timedelta(days=7 - i * 2)).isoformat()
        payload = {"indicator": INDICATOR, "value": value, "observed_at": observed}
        client.table("field_entries").insert(
            {
                "project_id": project_id,
                "source": "seed",
                "payload": payload,
                "recorded_at": observed,
            }
        ).execute()
        client.table("indicator_points").insert(
            {
                "project_id": project_id,
                "assumption_id": assumption_id,
                "indicator": INDICATOR,
                "value": value,
                "observed_at": observed,
            }
        ).execute()
        inserted += 1
    return inserted


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed M&E demo indicator points")
    parser.add_argument("--project-id", help="Target project UUID (default: first locked ToC)")
    args = parser.parse_args()

    from ai_service.services.supabase_client import supabase_client

    client = supabase_client.client
    project = find_demo_project(client, args.project_id)
    if not project:
        print("No project with a locked ToC found. Lock a ToC first, then re-run.")
        return 1

    project_id = project["id"]
    print(f"Seeding M&E demo for project {project_id}: {project.get('need', '')[:60]}…")

    locked_toc = (
        client.table("theories_of_change")
        .select("id")
        .eq("project_id", project_id)
        .eq("status", "locked")
        .order("version", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    if not locked_toc.data:
        print("Project has no locked ToC.")
        return 1

    toc_id = locked_toc.data["id"]
    assumptions = (
        client.table("toc_assumptions")
        .select("id, indicator, threshold")
        .eq("toc_id", toc_id)
        .execute()
    )
    assumption_id = None
    for a in assumptions.data or []:
        if a.get("indicator") == INDICATOR:
            assumption_id = a["id"]
            break

    if assumption_id is None and assumptions.data:
        assumption_id = assumptions.data[0]["id"]
        print(
            f"Note: no assumption for {INDICATOR}; linking points to "
            f"{assumptions.data[0].get('indicator')}"
        )

    count = seed_points(client, project_id, assumption_id)
    print(f"Inserted {count} indicator points ({INDICATOR}: {DEMO_VALUES}).")

    from uuid import UUID

    from ai_service.routers.mande import MandeEvaluateRequest, evaluate_project_signals
    import asyncio

    result = asyncio.run(
        evaluate_project_signals(MandeEvaluateRequest(project_id=UUID(project_id)))
    )
    if result.signals:
        for s in result.signals:
            print(f"Signal: {s.signal_type.upper()} — {s.rationale[:80]}…")
    else:
        print("No new signals (may already exist within 24h dedupe window).")

    print(f"Open /projects/{project_id} to view the dashboard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
