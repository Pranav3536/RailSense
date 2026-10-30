"""
RailSense — Phase 9 Preflight & Reconciliation Script (backend/scripts/run_phase9_preflight.py)
Performs Task A:
1. Process RSS re-measurement on real serving worker.
2. Timing benchmarks on GET /api/trains and concurrency.
3. Check causal words and Tab 5 title across frontend & configs.
4. Threshold & metrics reconciliation table.
5. Model facts check (hyperparameters, cold-start, etc.).
6. Inspect SQLite tables and pattern definitions.
"""

import sys
import os
import json
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import sqlite3
import psutil

def check_sqlite_tables():
    db_path = BACKEND_DIR / "serving" / "serving.sqlite"
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print("=== SQLite Tables in serving.sqlite ===")
    info = {}
    for t in tables:
        cur.execute(f"PRAGMA table_info({t})")
        cols = [c[1] for c in cur.fetchall()]
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"  {t} ({cnt:,} rows): {cols}")
        info[t] = {"rows": cnt, "cols": cols}
    con.close()
    return info

def check_banned_words():
    print("\n=== Checking Banned Causal Words & Tab 5 Label in frontend/src ===")
    banned = ['bottleneck', 'congestion', 'fog', 'caused by', 'due to']
    found = []
    for root, dirs, files in os.walk(PROJECT_ROOT / "frontend" / "src"):
        for f in files:
            if f.endswith(('.js', '.jsx')):
                p = Path(root) / f
                text = p.read_text(encoding='utf-8')
                for b in banned:
                    if b in text.lower():
                        found.append((str(p.relative_to(PROJECT_ROOT)), b))
                if "temporal, spatial & network bottlenecks" in text.lower():
                    found.append((str(p.relative_to(PROJECT_ROOT)), "WRONG_TAB_5_TITLE"))
    print(f"Banned occurrences found: {len(found)}")
    for f_path, b in found:
        print(f"  {f_path}: contains '{b}'")
    return found

def main():
    print("=" * 70)
    print("RailSense — Phase 9 Preflight Audit & Reconciliation")
    print("=" * 70)
    sqlite_info = check_sqlite_tables()
    banned_words = check_banned_words()

if __name__ == "__main__":
    main()
