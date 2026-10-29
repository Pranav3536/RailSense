"""
RailSense — Data Validation and Label Eligibility Rules.

Provides explicit, leakage-safe validation rules, anomaly detectors,
and label eligibility filtering without silent row deletion.
"""

from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd

# Explicit Threshold Constants
MAX_CREDIBLE_DELAY_MIN = 1440.0  # 24 hours
MIN_CREDIBLE_DELAY_MIN = -1440.0 # 24 hours early (probable date-wrap artifact)
MAX_CREDIBLE_SEQ = 200           # Indian Railways max stops for longest train (Himsagar Express ~73 stops)


def check_stop_key_duplicates(df: pd.DataFrame) -> Tuple[bool, int, pd.Series]:
    """
    Validates that (train_number, start_date, seq) uniquely identifies a row.
    Returns (is_unique, duplicate_count, duplicate_mask).
    """
    dup_mask = df.duplicated(subset=["train_number", "start_date", "seq"], keep=False)
    dup_count = int(dup_mask.sum())
    return dup_count == 0, dup_count, dup_mask


def check_repeated_station_visits(df: pd.DataFrame) -> Tuple[int, pd.Series]:
    """
    Identifies repeated station visits within a single run (train_number, start_date, station_code).
    These are legitimate circular or turnaround routes (not errors).
    """
    rep_mask = df.duplicated(subset=["train_number", "start_date", "station_code"], keep=False)
    return int(rep_mask.sum()), rep_mask


def check_label_eligibility(df: pd.DataFrame) -> pd.Series:
    """
    Defines the strict training-label eligibility mask:
    A row is eligible for arrival delay target modeling IF AND ONLY IF:
    1. arrival_delay_min is non-null
    2. arrival_reported == 1 (or truthy)
    3. seq > 1 (origin stops excluded since trains do not arrive at origin)
    4. abs(arrival_delay_min) <= MAX_CREDIBLE_DELAY_MIN (not a corrupt date-wrap artifact)
    """
    mask = (
        df["arrival_delay_min"].notna() &
        (df["arrival_reported"] == 1.0) &
        (df["seq"] > 1) &
        (df["arrival_delay_min"].abs() <= MAX_CREDIBLE_DELAY_MIN)
    )
    return mask


def flag_delay_outliers(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """
    Flags extreme delay anomalies without silent deletion.
    - extreme_early_flag: arrival_delay_min < -1440 min (date wrap artifact)
    - extreme_late_flag: arrival_delay_min > 1440 min (extreme delay > 24h)
    """
    has_delay = df["arrival_delay_min"].notna()
    early_flag = has_delay & (df["arrival_delay_min"] < MIN_CREDIBLE_DELAY_MIN)
    late_flag = has_delay & (df["arrival_delay_min"] > MAX_CREDIBLE_DELAY_MIN)
    return early_flag, late_flag


def flag_sequence_anomalies(df: pd.DataFrame) -> pd.Series:
    """
    Flags sequence numbers > MAX_CREDIBLE_SEQ (e.g. seq=1071 anomaly).
    """
    return df["seq"] > MAX_CREDIBLE_SEQ


def check_timestamp_sanity(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Checks timetable coherence and timing order:
    1. scheduled_departure < scheduled_arrival (same stop)
    2. actual_departure < actual_arrival (same stop)
    3. stored arrival_delay vs recomputed difference
    """
    results = {}
    
    # 1. Sched dep before sched arr
    both_sched = df["scheduled_arrival"].notna() & df["scheduled_departure"].notna()
    dep_before_arr_sched = both_sched & (df["scheduled_departure"] < df["scheduled_arrival"])
    results["sched_dep_before_arr_count"] = int(dep_before_arr_sched.sum())

    # 2. Act dep before act arr
    both_act = df["actual_arrival"].notna() & df["actual_departure"].notna()
    dep_before_arr_act = both_act & (df["actual_departure"] < df["actual_arrival"])
    results["act_dep_before_arr_count"] = int(dep_before_arr_act.sum())

    # 3. Delay consistency check
    valid_arr = df.dropna(subset=["scheduled_arrival", "actual_arrival", "arrival_delay_min"]).copy()
    if len(valid_arr) > 0:
        recomputed = (
            pd.to_datetime(valid_arr["actual_arrival"]) - pd.to_datetime(valid_arr["scheduled_arrival"])
        ).dt.total_seconds() / 60.0
        stored = valid_arr["arrival_delay_min"].astype(float)
        diff = (recomputed - stored).abs()
        results["consistency_checked_rows"] = len(valid_arr)
        results["exact_match_count"] = int((diff < 1e-3).sum())
        results["exact_match_pct"] = round(float((diff < 1e-3).mean() * 100), 3)
        results["max_abs_diff"] = round(float(diff.max()), 3)
    else:
        results["consistency_checked_rows"] = 0
        results["exact_match_pct"] = 100.0
        results["max_abs_diff"] = 0.0

    return results


def analyze_edge_days(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyzes edge day volume and censoring:
    - 2026-10-07: Left-truncation (data collection began mid-day)
    - 2026-10-25: Right-censoring (multi-day journeys cut off at end of extraction)
    """
    days = sorted(df["start_date"].astype(str).unique())
    edge_analysis = {}
    for day in days:
        sub = df[df["start_date"].astype(str) == day]
        runs_count = sub.groupby(["train_number", "start_date"], observed=False).ngroups
        labelled_count = int(sub["arrival_delay_min"].notna().sum())
        total_count = len(sub)
        edge_analysis[day] = {
            "total_rows": total_count,
            "runs": runs_count,
            "labelled_rows": labelled_count,
            "labelled_pct": round(labelled_count / total_count * 100, 2) if total_count else 0,
        }
    return edge_analysis
