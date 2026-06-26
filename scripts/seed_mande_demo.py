#!/usr/bin/env python3
"""
Seed M&E demo data for a project with a locked ToC.

Inserts three indicator points below the first locked assumption's threshold and
runs signal evaluation so the project dashboard shows an ADAPT signal.

Usage:
  python scripts/seed_mande_demo.py
  python scripts/seed_mande_demo.py --project-id <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


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


def demo_values_below(threshold: float) -> list[float]:
    """Three readings averaging below threshold (triggers ADAPT)."""
    base = max(threshold * 0.7, 1.0)
    return [round(base, 1), round(base + 0.5, 1), round(base + 0.2, 1)]


def seed_points(
    client,
    project_id: str,
    assumption_id: str | None,
    indicator: str,
    values: list[float],
) -> int:
    now = datetime.now(timezone.utc)
    inserted = 0
    for i, value in enumerate(values):
        observed = (now - timedelta(days=7 - i * 2)).isoformat()
        payload = {"indicator": indicator, "value": value, "observed_at": observed}
        client.table("field_entries").insert(
            {
                "project_id": project_id,
                "source": "web",
                "payload": payload,
                "recorded_at": observed,
            }
        ).execute()
        client.table("indicator_points").insert(
            {
                "project_id": project_id,
                "assumption_id": assumption_id,
                "indicator": indicator,
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

    from ai_service.routers.mande import MandeEvaluateRequest, evaluate_project_signals
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
        .select("id, indicator, threshold, statement")
        .eq("toc_id", toc_id)
        .execute()
    )
    rows = assumptions.data or []
    target = next((a for a in rows if a.get("threshold") is not None), None)
    if not target:
        print("No assumptions with thresholds on this locked ToC.")
        return 1

    indicator = str(target["indicator"])
    threshold = float(target["threshold"])
    assumption_id = target["id"]
    values = demo_values_below(threshold)

    count = seed_points(client, project_id, assumption_id, indicator, values)
    print(
        f"Inserted {count} indicator points ({indicator}: {values}, threshold {threshold})."
    )

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
