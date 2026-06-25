#!/usr/bin/env python3
"""
Ciel core eval gate — runs pytest suites required before merge (QAD §4).

Usage:
  python scripts/run_eval.py --suite core --gate
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_pytest(targets: list[str]) -> int:
    cmd = [sys.executable, "-m", "pytest", "-q", *targets]
    print(f"Running: {' '.join(cmd)}")
    return subprocess.call(cmd, cwd=ROOT)


def main() -> int:
    parser = argparse.ArgumentParser(description="Ciel eval runner")
    parser.add_argument("--suite", choices=["core"], default="core")
    parser.add_argument("--gate", action="store_true", help="Exit non-zero on failure")
    args = parser.parse_args()

    if args.suite == "core":
        code = run_pytest([
            "ai_service/tests/test_h01_grounding.py",
            "ai_service/tests/test_h01_interrogate.py",
            "ai_service/tests/test_h01_graph_sse.py",
            "ai_service/tests/test_h02_lock_gate.py",
        ])
    else:
        code = 1

    if args.gate and code != 0:
        print("EVAL GATE: FAIL")
        return code

    if code == 0:
        print("EVAL GATE: PASS")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
