"""
RailSense — Read-Only Serving Store Client (backend/app/serving_client.py)
Provides thread-safe, sub-millisecond query access to precomputed SQLite catalogs
and JSON analytics documents without executing heavy runtime aggregations on TiDB.
"""

import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import rapidfuzz

DEFAULT_SERVING_DIR = Path(__file__).resolve().parent.parent / "serving"


class ServingClient:
    """
    Read-only SQLite query client and static JSON analytics loader.
    """

    def __init__(self, serving_dir: Optional[Path] = None):
        self.serving_dir = Path(serving_dir or DEFAULT_SERVING_DIR)
        self.sqlite_path = self.serving_dir / "serving.sqlite"

    def get_connection(self) -> sqlite3.Connection:
        """Opens a read-only SQLite connection using URI mode."""
        if not self.sqlite_path.exists():
            raise FileNotFoundError(
                f"Serving database not found at {self.sqlite_path}. "
                "Run 'python backend/scripts/build_serving_data.py' first."
            )
        # URI mode with mode=ro enforces strict read-only access
        conn = sqlite3.connect(
            f"file:{self.sqlite_path.as_posix()}?mode=ro",
            uri=True,
            check_same_thread=False
        )
        conn.row_factory = sqlite3.Row
        return conn

    # -------------------------------------------------------------
    # Train Catalog Queries
    # -------------------------------------------------------------
    def get_trains(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Returns paginated train catalog with optional search and category filters."""
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        conn = self.get_connection()
        cur = conn.cursor()

        conditions = []
        params = []

        if category:
            conditions.append("category = ?")
            params.append(category.upper().strip())

        if query:
            q_clean = query.strip()
            # If query is digits, match prefix of train_number
            if q_clean.isdigit():
                conditions.append("train_number LIKE ?")
                params.append(f"{q_clean}%")
            else:
                conditions.append("train_name LIKE ?")
                params.append(f"%{q_clean}%")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Total count
        cur.execute(f"SELECT COUNT(*) FROM trains {where_clause};", params)
        total_items = cur.fetchone()[0]

        # Paginated items
        cur.execute(
            f"SELECT * FROM trains {where_clause} ORDER BY train_number ASC LIMIT ? OFFSET ?;",
            params + [page_size, offset]
        )
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()

        total_pages = max(1, (total_items + page_size - 1) // page_size)

        return {
            "items": rows,
            "pagination": {
                "total": total_items,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

    def get_train_detail(self, train_number: Union[str, int]) -> Optional[Dict[str, Any]]:
        """Returns comprehensive catalog stats, schedule template, stop stats, and date stats."""
        tr_str = str(train_number).strip()
        conn = self.get_connection()
        cur = conn.cursor()

        # 1. Train Summary
        cur.execute("SELECT * FROM trains WHERE train_number = ?;", (tr_str,))
        tr_row = cur.fetchone()
        if not tr_row:
            conn.close()
            return None

        train_data = dict(tr_row)

        # 2. Stops Schedule Template
        cur.execute(
            "SELECT * FROM train_stops WHERE train_number = ? ORDER BY seq ASC;",
            (tr_str,)
        )
        stops = [dict(r) for r in cur.fetchall()]

        # 3. Per-Stop Observed Delay Statistics
        cur.execute(
            "SELECT * FROM train_stop_stats WHERE train_number = ? ORDER BY seq ASC;",
            (tr_str,)
        )
        stop_stats = {f"{r['seq']}_{r['station_code']}": dict(r) for r in cur.fetchall()}

        # Merge stop stats into schedule template
        for s in stops:
            key = f"{s['seq']}_{s['station_code']}"
            stat = stop_stats.get(key, {})
            s['observed_stops_count'] = stat.get('observed_stops', 0)
            s['observed_delayed_rate'] = stat.get('delayed_rate', None)
            s['observed_mean_delay_min'] = stat.get('mean_delay', None)

        # 4. Per-Date Run Statistics
        cur.execute(
            "SELECT * FROM train_date_stats WHERE train_number = ? ORDER BY start_date ASC;",
            (tr_str,)
        )
        date_stats = [dict(r) for r in cur.fetchall()]
        conn.close()

        train_data["stops"] = stops
        train_data["history_by_date"] = date_stats
        train_data["definition"] = "Observed delay metrics are calculated from label-eligible stops (arrival_delay_min > 15m) in the 19-day dataset window."

        return train_data

    # -------------------------------------------------------------
    # Station Catalog Queries
    # -------------------------------------------------------------
    def get_stations(
        self,
        query: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Returns paginated station catalog with optional code prefix search."""
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        conn = self.get_connection()
        cur = conn.cursor()

        conditions = []
        params = []

        if query:
            conditions.append("station_code LIKE ?")
            params.append(f"{query.upper().strip()}%")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        cur.execute(f"SELECT COUNT(*) FROM stations {where_clause};", params)
        total_items = cur.fetchone()[0]

        cur.execute(
            f"SELECT * FROM stations {where_clause} ORDER BY stops_count DESC LIMIT ? OFFSET ?;",
            params + [page_size, offset]
        )
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d["category_mix"] = json.loads(d.pop("category_mix_json", "{}"))
            rows.append(d)

        conn.close()
        total_pages = max(1, (total_items + page_size - 1) // page_size)

        return {
            "items": rows,
            "pagination": {
                "total": total_items,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

    def get_station_detail(self, station_code: str) -> Optional[Dict[str, Any]]:
        """Returns single station delay stats, Wilson confidence bounds, and category mix."""
        stn_code = str(station_code).upper().strip()
        conn = self.get_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM stations WHERE station_code = ?;", (stn_code,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return None

        data = dict(row)
        data["category_mix"] = json.loads(data.pop("category_mix_json", "{}"))

        # Top 10 trains calling at this station
        cur.execute("""
            SELECT t.train_number, t.train_name, t.category, s.observed_stops, s.delayed_rate, s.mean_delay
            FROM train_stop_stats s
            JOIN trains t ON s.train_number = t.train_number
            WHERE s.station_code = ?
            ORDER BY s.observed_stops DESC LIMIT 10;
        """, (stn_code,))
        data["calling_trains_sample"] = [dict(r) for r in cur.fetchall()]
        conn.close()

        data["definition"] = "Station delay metrics represent arrivals delayed > 15m with 95% Wilson score confidence intervals."
        return data

    # -------------------------------------------------------------
    # Predict Route Resolution Helper
    # -------------------------------------------------------------
    def resolve_train_stop(
        self,
        train_number: Union[str, int],
        station_code: str,
        seq: Optional[int] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[Any]]:
        """
        Resolves schedule attributes for prediction input.
        Returns: (stop_dict, error_code, details)
        """
        tr_str = str(train_number).strip()
        stn_str = str(station_code).upper().strip()

        conn = self.get_connection()
        cur = conn.cursor()

        # Check train exists
        cur.execute("SELECT category FROM trains WHERE train_number = ?;", (tr_str,))
        tr_row = cur.fetchone()
        if not tr_row:
            conn.close()
            return None, "TRAIN_NOT_FOUND", f"Train {tr_str} not found in catalog."

        category = tr_row["category"]

        # If seq provided, look up exact stop
        if seq is not None:
            seq_val = int(seq)
            cur.execute(
                "SELECT * FROM train_stops WHERE train_number = ? AND seq = ?;",
                (tr_str, seq_val)
            )
            stop_row = cur.fetchone()
            conn.close()

            if not stop_row:
                return None, "SEQ_NOT_FOUND", f"Sequence {seq_val} not found on train {tr_str} route."
            
            s_dict = dict(stop_row)
            if s_dict["station_code"] != stn_str:
                return None, "STATION_SEQ_MISMATCH", f"Stop seq {seq_val} is station {s_dict['station_code']}, not {stn_str}."

            if s_dict["is_origin"] == 1 or s_dict["seq"] == 1:
                return None, "ORIGIN_STOP", "Origin stops depart but do not have an arrival delay to predict."

            s_dict["category"] = category
            return s_dict, None, None

        # Look up by station code
        cur.execute(
            "SELECT * FROM train_stops WHERE train_number = ? AND station_code = ? ORDER BY seq ASC;",
            (tr_str, stn_str)
        )
        matching_stops = [dict(r) for r in cur.fetchall()]
        conn.close()

        if not matching_stops:
            return None, "STATION_NOT_ON_ROUTE", f"Station {stn_str} does not appear on train {tr_str}'s route."

        if len(matching_stops) > 1:
            valid_seqs = [s["seq"] for s in matching_stops]
            return None, "MULTIPLE_STOPS_REQUIRE_SEQ", {
                "message": f"Train {tr_str} calls at station {stn_str} multiple times. Please specify 'seq'.",
                "valid_seq_options": valid_seqs
            }

        s_dict = matching_stops[0]
        if s_dict["is_origin"] == 1 or s_dict["seq"] == 1:
            return None, "ORIGIN_STOP", "Origin stops depart but do not have an arrival delay to predict."

        s_dict["category"] = category
        return s_dict, None, None

    # -------------------------------------------------------------
    # Static Analytics JSON Loaders
    # -------------------------------------------------------------
    def get_overview_json(self) -> Dict[str, Any]:
        p = self.serving_dir / "overview.json"
        if not p.exists():
            raise FileNotFoundError(f"Missing {p}. Run build_serving_data.py first.")
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_patterns_json(self) -> Dict[str, Any]:
        p = self.serving_dir / "patterns.json"
        if not p.exists():
            raise FileNotFoundError(f"Missing {p}. Run build_serving_data.py first.")
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_model_lab_json(self) -> Dict[str, Any]:
        p = self.serving_dir / "model_lab.json"
        if not p.exists():
            raise FileNotFoundError(f"Missing {p}. Run build_serving_data.py first.")
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
