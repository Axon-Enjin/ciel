#!/usr/bin/env python3
"""
Verify Supabase connectivity and optionally seed the evidence corpus.

Usage:
  python scripts/setup_db.py --check
  python scripts/setup_db.py --seed
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def check_connection() -> bool:
    try:
        from ai_service.services.supabase_client import supabase_client

        ok = supabase_client.client.table("organizations").select("id").limit(1).execute()
        print(f"Supabase OK — organizations reachable ({len(ok.data)} row sample)")
        return True
    except Exception as exc:
        print(f"Supabase check failed: {exc}")
        print("Ensure migrations are applied and SUPABASE_URL / SUPABASE_SERVICE_KEY are set in ai_service/.env")
        return False


def seed_evidence() -> bool:
    try:
        import asyncio
        from ai_service.scripts.seed_evidence import seed_corpus

        asyncio.run(seed_corpus())
        print("Evidence corpus seed complete.")
        return True
    except Exception as exc:
        print(f"Seed failed: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify DB connectivity")
    parser.add_argument("--seed", action="store_true", help="Seed evidence corpus")
    args = parser.parse_args()

    if not args.check and not args.seed:
        args.check = True

    ok = True
    if args.check:
        ok = check_connection() and ok
    if args.seed:
        ok = seed_evidence() and ok

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
