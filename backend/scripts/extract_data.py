"""
Extract data from TiDB Cloud in chunks per start_date and save to local Parquet cache.
Only reads using the read-only engine.
Downcasts data types to save memory.
"""

import sys
import os
import json
import time
from pathlib import Path
from datetime import datetime
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from tools.refresh.config import load_db_config
from tools.refresh.engine import create_db_engine, execute_read_only_query

CACHE_DIR = backend_dir / "data_cache"

# Optimal dtypes for memory efficiency
DTYPE_MAPPING = {
    "id": "int64",
    "train_number": "category",
    "train_name": "category",
    "category": "category",
    "status": "category",
    "seq": "int16",
    "station_code": "category",
    "arrival_reported": "float32",  # has NULLs
    "departure_reported": "float32", # has NULLs
    "arrival_delay_min": "float32",  # has NULLs
    "departure_delay_min": "float32",# has NULLs
    "run_quality": "float32",
}


def extract_all():
    print("=" * 70)
    print("RailSense — Extracting TiDB train_records to Local Parquet Cache")
    print("=" * 70)
    start_total = time.perf_counter()

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    config = load_db_config()
    engine = create_db_engine(config)

    # 1. Get all distinct dates
    cols, rows = execute_read_only_query(
        engine,
        "SELECT DISTINCT DATE(start_date) AS d FROM train_records ORDER BY d;"
    )
    dates = [str(r[0]) for r in rows]
    print(f"Found {len(dates)} dates to extract: {dates[0]} to {dates[-1]}")

    metadata = {
        "extracted_at": datetime.now().isoformat(),
        "database": config.database,
        "table": "train_records",
        "dates": {},
        "total_rows": 0,
        "total_size_bytes": 0,
    }

    total_rows = 0

    for i, day in enumerate(dates, 1):
        t0 = time.perf_counter()
        sql = f"""
        SELECT 
            id, train_number, train_name, category, start_date, status, seq,
            station_code, scheduled_arrival, scheduled_departure,
            actual_arrival, actual_departure, arrival_reported, departure_reported,
            arrival_delay_min, departure_delay_min, run_quality
        FROM train_records
        WHERE start_date = '{day}'
        ORDER BY train_number, seq;
        """
        # Execute query
        cols, rows = execute_read_only_query(engine, sql, max_rows=300000)
        df_chunk = pd.DataFrame(rows, columns=cols)
        row_count = len(df_chunk)
        total_rows += row_count

        # Parse datetime columns
        for dt_col in ["scheduled_arrival", "scheduled_departure", "actual_arrival", "actual_departure"]:
            df_chunk[dt_col] = pd.to_datetime(df_chunk[dt_col])
        df_chunk["start_date"] = pd.to_datetime(df_chunk["start_date"]).dt.date

        # Downcast
        for col_name, dtype in DTYPE_MAPPING.items():
            if col_name in df_chunk.columns:
                df_chunk[col_name] = df_chunk[col_name].astype(dtype)

        # Save to parquet
        out_path = CACHE_DIR / f"train_records_{day}.parquet"
        df_chunk.to_parquet(out_path, engine="pyarrow", index=False, compression="snappy")
        file_size = out_path.stat().st_size
        elapsed = time.perf_counter() - t0

        metadata["dates"][day] = {
            "rows": row_count,
            "size_bytes": file_size,
            "duration_seconds": round(elapsed, 2),
        }
        metadata["total_size_bytes"] += file_size
        print(f"[{i:02d}/{len(dates)}] {day}: {row_count:,} rows, {file_size / (1024*1024):.2f} MB, {elapsed:.2f}s")

    total_duration = time.perf_counter() - start_total
    metadata["total_rows"] = total_rows
    metadata["total_duration_seconds"] = round(total_duration, 2)
    metadata["total_size_mb"] = round(metadata["total_size_bytes"] / (1024 * 1024), 2)

    meta_file = CACHE_DIR / "cache_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("-" * 70)
    print(f"Extraction Complete!")
    print(f"Total Rows Extracted: {total_rows:,} (Expected: 2,805,574)")
    print(f"Total Cache Size: {metadata['total_size_mb']} MB")
    print(f"Total Time: {total_duration:.1f}s")
    if total_rows == 2805574:
        print("[SUCCESS] Exact row count match verified!")
    else:
        print(f"[FLAG] Row count mismatch: {total_rows} vs 2,805,574")
    print("=" * 70)


if __name__ == "__main__":
    extract_all()
