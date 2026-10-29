"""
RailSense — Build Serving Data Store Script
Extracts, aggregates, and builds:
1. SQLite database backend/serving/serving.sqlite (catalogs, schedule templates, stop & date stats)
2. JSON analytics documents (overview.json, patterns.json, model_lab.json)
Enforces strict audit-total assertions and provenance tracking.
"""

import json
import math
import os
import sqlite3
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import precision_recall_curve, roc_curve, average_precision_score, roc_auc_score

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.ml.validation import check_label_eligibility
from app.ml.features import ScheduleTimeFeatureExtractor, HistoricalPriorTransformer, extract_features_and_target
from app.ml.metrics import compute_expected_calibration_error

CACHE_DIR = PROJECT_ROOT / "backend" / "data_cache"
SERVING_DIR = PROJECT_ROOT / "backend" / "serving"
MODELS_DIR = PROJECT_ROOT / "backend" / "models"
DOCS_DIR = PROJECT_ROOT / "docs"
EXPERIMENTS_DIR = DOCS_DIR / "experiments"

SERVING_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_PATH = SERVING_DIR / "serving.sqlite"

# Expected Audit Invariants from Phase 2
EXPECTED_TOTAL_ROWS = 2805574
EXPECTED_TOTAL_RUNS = 147367


def wilson_score_interval(successes: int, total: int, z: float = 1.96):
    """Computes Wilson score 95% confidence interval for a proportion."""
    if total == 0:
        return 0.0, 0.0
    p = successes / total
    denom = 1 + z**2 / total
    centre = (p + z**2 / (2 * total)) / denom
    spread = (z * math.sqrt((p * (1 - p) + z**2 / (4 * total)) / total)) / denom
    return max(0.0, centre - spread), min(1.0, centre + spread)


def load_all_cache_data():
    """Loads all 19 parquet files from cache."""
    parquet_files = sorted(CACHE_DIR.glob("train_records_*.parquet"))
    dfs = []
    for pf in parquet_files:
        dfs.append(pd.read_parquet(pf))
    return pd.concat(dfs, ignore_index=True)


def load_parquet_dates(dates):
    """Loads specific dates from local parquet cache."""
    dfs = []
    for d in dates:
        p = CACHE_DIR / f"train_records_{d}.parquet"
        if p.exists():
            dfs.append(pd.read_parquet(p))
    return pd.concat(dfs, ignore_index=True)


def build_serving_store():
    start_time = time.time()
    print("=" * 70)
    print("RailSense — Building Serving Data Store")
    print("=" * 70)

    # 1. Load entire 2.8M row cache
    print("\n[Step 1/5] Loading 2,805,574 rows from local parquet cache...")
    df = load_all_cache_data()
    total_rows = len(df)
    total_runs = df.groupby(['train_number', 'start_date']).ngroups
    print(f"  Loaded {total_rows:,} rows across {total_runs:,} runs.")

    # Strict Audit Total Assertion
    assert total_rows == EXPECTED_TOTAL_ROWS, f"Audit Mismatch! Expected {EXPECTED_TOTAL_ROWS:,} rows, found {total_rows:,}"
    assert total_runs == EXPECTED_TOTAL_RUNS, f"Audit Mismatch! Expected {EXPECTED_TOTAL_RUNS:,} runs, found {total_runs:,}"
    print("  [PASS] Audit totals exactly match Phase 2 ground truth.")

    # Mask eligible rows
    print("\n[Step 2/5] Evaluating label eligibility...")
    eligible_mask = check_label_eligibility(df)
    df['is_eligible'] = eligible_mask
    df['is_delayed'] = np.where(df['is_eligible'] & (df['arrival_delay_min'] > 15), 1, 0)

    # -------------------------------------------------------------
    # 2. Build SQLite Database
    # -------------------------------------------------------------
    print(f"\n[Step 3/5] Populating SQLite database: {SQLITE_PATH}...")
    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()

    conn = sqlite3.connect(SQLITE_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode = OFF;")
    cur.execute("PRAGMA synchronous = OFF;")

    # Table 1: Trains Catalog
    print("  Building 'trains' catalog table...")
    cur.execute("""
    CREATE TABLE trains (
        train_number TEXT PRIMARY KEY,
        train_name TEXT,
        category TEXT NOT NULL,
        runs_count INTEGER NOT NULL,
        days_observed INTEGER NOT NULL,
        stops_count INTEGER NOT NULL,
        origin_station_code TEXT NOT NULL,
        terminus_station_code TEXT NOT NULL,
        delayed_rate REAL NOT NULL,
        mean_delay REAL NOT NULL,
        eligible_stops_count INTEGER NOT NULL
    );
    """)

    # Compute train stats
    # Origin and terminus from min and max seq
    train_groups = df.groupby('train_number')
    train_records = []
    
    # We aggregate runs, days, names, categories
    for tr_num, grp in train_groups:
        tr_str = str(tr_num)
        tr_name = str(grp['train_name'].dropna().iloc[0]) if grp['train_name'].notna().any() else ""
        cat = str(grp['category'].dropna().iloc[0]) if grp['category'].notna().any() else "OTHER"
        runs_c = grp['start_date'].nunique()
        days_c = grp['start_date'].nunique()

        # Find complete run (run with max stops)
        run_lens = grp.groupby('start_date')['seq'].count()
        best_date = run_lens.idxmax()
        complete_run = grp[grp['start_date'] == best_date].sort_values('seq')

        stops_c = len(complete_run)
        origin_stn = str(complete_run.iloc[0]['station_code'])
        term_stn = str(complete_run.iloc[-1]['station_code'])

        el_sub = grp[grp['is_eligible']]
        n_el = len(el_sub)
        del_rate = float((el_sub['is_delayed'].sum() / n_el * 100)) if n_el > 0 else 0.0
        mean_del = float(el_sub['arrival_delay_min'].mean()) if n_el > 0 else 0.0

        train_records.append((
            tr_str, tr_name, cat, runs_c, days_c, stops_c,
            origin_stn, term_stn, round(del_rate, 2), round(mean_del, 2), n_el
        ))

    cur.executemany("INSERT INTO trains VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", train_records)
    cur.execute("CREATE INDEX idx_trains_cat ON trains(category);")
    cur.execute("CREATE INDEX idx_trains_name ON trains(train_name);")
    print(f"    Inserted {len(train_records):,} trains into 'trains'.")

    # Table 2: Train Schedule Templates (Stops per train)
    print("  Building 'train_stops' schedule templates table...")
    cur.execute("""
    CREATE TABLE train_stops (
        train_number TEXT NOT NULL,
        seq INTEGER NOT NULL,
        station_code TEXT NOT NULL,
        scheduled_arrival_time TEXT,
        scheduled_departure_time TEXT,
        arrival_day_offset INTEGER NOT NULL DEFAULT 0,
        departure_day_offset INTEGER NOT NULL DEFAULT 0,
        is_origin INTEGER NOT NULL DEFAULT 0,
        is_terminus INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (train_number, seq)
    );
    """)

    train_stops_rows = []
    for tr_num, grp in train_groups:
        tr_str = str(tr_num)
        run_lens = grp.groupby('start_date')['seq'].count()
        best_date = run_lens.idxmax()
        best_run = grp[grp['start_date'] == best_date].sort_values('seq').copy()

        start_dt = pd.to_datetime(best_date)
        n_stops = len(best_run)

        for i, (_, row) in enumerate(best_run.iterrows()):
            seq_val = int(row['seq'])
            stn_code = str(row['station_code'])
            
            # Arrival time & day offset
            arr_time_str = None
            arr_offset = 0
            if pd.notna(row['scheduled_arrival']):
                arr_dt = pd.to_datetime(row['scheduled_arrival'])
                arr_time_str = arr_dt.strftime("%H:%M")
                arr_offset = (arr_dt.date() - start_dt.date()).days

            # Departure time & day offset
            dep_time_str = None
            dep_offset = 0
            if pd.notna(row['scheduled_departure']):
                dep_dt = pd.to_datetime(row['scheduled_departure'])
                dep_time_str = dep_dt.strftime("%H:%M")
                dep_offset = (dep_dt.date() - start_dt.date()).days

            is_orig = 1 if i == 0 else 0
            is_term = 1 if i == n_stops - 1 else 0

            train_stops_rows.append((
                tr_str, seq_val, stn_code, arr_time_str, dep_time_str,
                arr_offset, dep_offset, is_orig, is_term
            ))

    cur.executemany("INSERT INTO train_stops VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);", train_stops_rows)
    cur.execute("CREATE INDEX idx_train_stops_lookup ON train_stops(train_number, station_code);")
    cur.execute("CREATE INDEX idx_train_stops_stn ON train_stops(station_code);")
    print(f"    Inserted {len(train_stops_rows):,} stops into 'train_stops'.")

    # Table 3: Station Catalog
    print("  Building 'stations' catalog table...")
    cur.execute("""
    CREATE TABLE stations (
        station_code TEXT PRIMARY KEY,
        trains_count INTEGER NOT NULL,
        stops_count INTEGER NOT NULL,
        delayed_rate REAL NOT NULL,
        mean_delay REAL NOT NULL,
        wilson_lower REAL NOT NULL,
        wilson_upper REAL NOT NULL,
        category_mix_json TEXT NOT NULL
    );
    """)

    stn_groups = df.groupby('station_code')
    station_rows = []
    for stn_code, grp in stn_groups:
        stn_str = str(stn_code)
        trains_c = grp['train_number'].nunique()
        stops_c = len(grp)

        el_sub = grp[grp['is_eligible']]
        n_el = len(el_sub)
        n_del = int(el_sub['is_delayed'].sum())
        del_rate = float(n_del / n_el * 100) if n_el > 0 else 0.0
        mean_del = float(el_sub['arrival_delay_min'].mean()) if n_el > 0 else 0.0

        w_low, w_high = wilson_score_interval(n_del, n_el)
        cat_mix = grp['category'].value_counts().head(5).to_dict()

        station_rows.append((
            stn_str, trains_c, stops_c, round(del_rate, 2), round(mean_del, 2),
            round(w_low * 100, 2), round(w_high * 100, 2), json.dumps(cat_mix)
        ))

    cur.executemany("INSERT INTO stations VALUES (?, ?, ?, ?, ?, ?, ?, ?);", station_rows)
    cur.execute("CREATE INDEX idx_stations_delayed ON stations(delayed_rate);")
    cur.execute("CREATE INDEX idx_stations_stops ON stations(stops_count);")
    print(f"    Inserted {len(station_rows):,} stations into 'stations'.")

    # Table 4: Train Per-Stop Historical Delay Statistics
    print("  Building 'train_stop_stats' table...")
    cur.execute("""
    CREATE TABLE train_stop_stats (
        train_number TEXT NOT NULL,
        seq INTEGER NOT NULL,
        station_code TEXT NOT NULL,
        observed_stops INTEGER NOT NULL,
        delayed_rate REAL NOT NULL,
        mean_delay REAL NOT NULL,
        PRIMARY KEY (train_number, seq, station_code)
    );
    """)

    df_el_only = df[df['is_eligible']].copy()
    stop_stats = df_el_only.groupby(['train_number', 'seq', 'station_code']).agg(
        observed_stops=('is_delayed', 'count'),
        delayed_count=('is_delayed', 'sum'),
        mean_delay=('arrival_delay_min', 'mean')
    ).reset_index()

    stop_stat_rows = [
        (str(r['train_number']), int(r['seq']), str(r['station_code']), int(r['observed_stops']),
         round(float(r['delayed_count'] / r['observed_stops'] * 100), 2), round(float(r['mean_delay']), 2))
        for _, r in stop_stats.iterrows()
    ]
    cur.executemany("INSERT INTO train_stop_stats VALUES (?, ?, ?, ?, ?, ?);", stop_stat_rows)
    cur.execute("CREATE INDEX idx_stop_stats_stn ON train_stop_stats(station_code);")
    print(f"    Inserted {len(stop_stat_rows):,} stop stats into 'train_stop_stats'.")

    # Table 5: Train Per-Date Historical Run Statistics
    print("  Building 'train_date_stats' table...")
    cur.execute("""
    CREATE TABLE train_date_stats (
        train_number TEXT NOT NULL,
        start_date TEXT NOT NULL,
        stops_count INTEGER NOT NULL,
        delayed_rate REAL NOT NULL,
        mean_delay REAL NOT NULL,
        PRIMARY KEY (train_number, start_date)
    );
    """)

    date_stats = df_el_only.groupby(['train_number', 'start_date']).agg(
        stops_count=('is_delayed', 'count'),
        delayed_count=('is_delayed', 'sum'),
        mean_delay=('arrival_delay_min', 'mean')
    ).reset_index()

    date_stat_rows = [
        (str(r['train_number']), str(r['start_date']), int(r['stops_count']),
         round(float(r['delayed_count'] / r['stops_count'] * 100), 2), round(float(r['mean_delay']), 2))
        for _, r in date_stats.iterrows()
    ]
    cur.executemany("INSERT INTO train_date_stats VALUES (?, ?, ?, ?, ?);", date_stat_rows)
    cur.execute("CREATE INDEX idx_train_date ON train_date_stats(train_number);")
    print(f"    Inserted {len(date_stat_rows):,} date stats into 'train_date_stats'.")

    conn.commit()
    conn.close()

    sqlite_size_mb = SQLITE_PATH.stat().st_size / (1024 * 1024)
    print(f"  [OK] SQLite serving database created: {sqlite_size_mb:.2f} MB")

    # -------------------------------------------------------------
    # 3. Precomputed Analytics JSON: overview.json
    # -------------------------------------------------------------
    print("\n[Step 4/5] Building overview.json...")
    df_eligible = df[df['is_eligible']].copy()

    # Per date trend
    date_trend = []
    for d, grp in df.groupby('start_date'):
        d_str = str(d)
        n_tot = len(grp)
        n_runs = grp['train_number'].nunique()
        el_grp = grp[grp['is_eligible']]
        n_el = len(el_grp)
        d_rate = float(el_grp['is_delayed'].sum() / n_el * 100) if n_el > 0 else 0.0
        m_delay = float(el_grp['arrival_delay_min'].mean()) if n_el > 0 else 0.0

        is_partial = bool(d_str in ["2026-10-07", "2026-10-25"])
        partial_note = "Left-truncated collection start" if d_str == "2026-10-07" else ("Right-censored collection cut-off" if d_str == "2026-10-25" else None)

        date_trend.append({
            "date": d_str,
            "total_stops": n_tot,
            "runs_count": n_runs,
            "eligible_stops": n_el,
            "delayed_rate": round(d_rate, 2),
            "mean_delay_min": round(m_delay, 2),
            "is_partial": is_partial,
            "partial_note": partial_note
        })

    # Category breakdown
    cat_breakdown = []
    for cat_name, grp in df.groupby('category'):
        cat_str = str(cat_name)
        n_tot = len(grp)
        el_grp = grp[grp['is_eligible']]
        n_el = len(el_grp)
        d_rate = float(el_grp['is_delayed'].sum() / n_el * 100) if n_el > 0 else 0.0
        m_delay = float(el_grp['arrival_delay_min'].mean()) if n_el > 0 else 0.0
        med_delay = float(el_grp['arrival_delay_min'].median()) if n_el > 0 else 0.0

        cat_breakdown.append({
            "category": cat_str,
            "total_stops": n_tot,
            "eligible_stops": n_el,
            "delayed_rate": round(d_rate, 2),
            "mean_delay_min": round(m_delay, 2),
            "median_delay_min": round(med_delay, 2)
        })

    overview_data = {
        "provenance": {
            "built_at": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "source": "TiDB Cloud railsense.train_records (via local cache)",
            "row_count": total_rows,
            "runs_count": total_runs,
            "date_range": "2026-10-07 to 2026-10-25",
            "build_script_version": "1.0.0"
        },
        "fleet_kpis": {
            "total_stops_observed": total_rows,
            "total_train_runs": total_runs,
            "distinct_train_numbers": int(df['train_number'].nunique()),
            "distinct_stations": int(df['station_code'].nunique()),
            "date_range": {
                "start": "2026-10-07",
                "end": "2026-10-25",
                "days": 19
            }
        },
        "delay_summary": {
            "definition": "Delay is classified as arrival_delay_min > 15 minutes evaluated strictly on label-eligible stops (arrival_reported=1, seq>1, |delay|<=1440m). Negative delays are valid early arrivals and never clipped.",
            "eligible_stops_count": int(len(df_eligible)),
            "label_coverage_pct": round(len(df_eligible) / total_rows * 100, 2),
            "fleet_delayed_rate": round(float(df_eligible['is_delayed'].sum() / len(df_eligible) * 100), 2),
            "fleet_mean_delay_min": round(float(df_eligible['arrival_delay_min'].mean()), 2),
            "fleet_median_delay_min": round(float(df_eligible['arrival_delay_min'].median()), 2),
            "fleet_early_arrival_pct": round(float((df_eligible['arrival_delay_min'] < 0).sum() / len(df_eligible) * 100), 2)
        },
        "category_breakdown": sorted(cat_breakdown, key=lambda x: x['eligible_stops'], reverse=True),
        "per_date_trend": date_trend
    }

    with open(SERVING_DIR / "overview.json", "w", encoding="utf-8") as f:
        json.dump(overview_data, f, indent=2)
    print("  [OK] Saved overview.json")

    # -------------------------------------------------------------
    # 4. Precomputed Analytics JSON: patterns.json
    # -------------------------------------------------------------
    print("\n[Step 5/5] Building patterns.json and model_lab.json...")
    
    # 1. By Hour
    df_eligible['hour'] = pd.to_datetime(df_eligible['scheduled_arrival']).dt.hour
    hour_stats = []
    for hr, grp in df_eligible.groupby('hour'):
        hour_stats.append({
            "hour": int(hr),
            "stops_count": len(grp),
            "delayed_rate": round(float(grp['is_delayed'].mean() * 100), 2),
            "mean_delay_min": round(float(grp['arrival_delay_min'].mean()), 2)
        })

    # 2. By Day of Week
    df_eligible['dow'] = pd.to_datetime(df_eligible['scheduled_arrival']).dt.day_name()
    dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dow_stats = []
    for dow in dow_order:
        grp = df_eligible[df_eligible['dow'] == dow]
        if len(grp) > 0:
            dow_stats.append({
                "day_of_week": dow,
                "stops_count": len(grp),
                "delayed_rate": round(float(grp['is_delayed'].mean() * 100), 2),
                "mean_delay_min": round(float(grp['arrival_delay_min'].mean()), 2)
            })

    # 3. By Sequence Position Bucket
    df_eligible['pos_bucket'] = pd.cut(
        df_eligible['seq'],
        bins=[1, 3, 10, 25, 50, 2000],
        labels=['Early (2-3)', 'Mid-Early (4-10)', 'Mid (11-25)', 'Late (26-50)', 'Deep (>50)']
    )
    pos_stats = []
    for p_name, grp in df_eligible.groupby('pos_bucket', observed=False):
        if len(grp) > 0:
            pos_stats.append({
                "position_bucket": str(p_name),
                "stops_count": len(grp),
                "delayed_rate": round(float(grp['is_delayed'].mean() * 100), 2),
                "mean_delay_min": round(float(grp['arrival_delay_min'].mean()), 2)
            })

    # 4. Station Hotspots (Top & Bottom, min support N >= 100)
    stn_agg = df_eligible.groupby('station_code').agg(
        stops_count=('is_delayed', 'count'),
        delayed_count=('is_delayed', 'sum'),
        mean_delay=('arrival_delay_min', 'mean')
    ).reset_index()
    stn_agg = stn_agg[stn_agg['stops_count'] >= 100].copy()
    stn_agg['delayed_rate'] = stn_agg['delayed_count'] / stn_agg['stops_count'] * 100

    wilson_intervals = [
        wilson_score_interval(r['delayed_count'], r['stops_count']) for _, r in stn_agg.iterrows()
    ]
    stn_agg['wilson_lower'] = [round(w[0] * 100, 2) for w in wilson_intervals]
    stn_agg['wilson_upper'] = [round(w[1] * 100, 2) for w in wilson_intervals]

    top_stn_hotspots = stn_agg.sort_values('wilson_lower', ascending=False).head(50).to_dict(orient='records')
    top_stn_punctual = stn_agg.sort_values('wilson_upper', ascending=True).head(50).to_dict(orient='records')

    # 5. Train Hotspots (Top & Bottom, min support N >= 50)
    train_agg = df_eligible.groupby('train_number').agg(
        stops_count=('is_delayed', 'count'),
        delayed_count=('is_delayed', 'sum'),
        mean_delay=('arrival_delay_min', 'mean')
    ).reset_index()
    train_agg = train_agg[train_agg['stops_count'] >= 50].copy()
    train_agg['delayed_rate'] = train_agg['delayed_count'] / train_agg['stops_count'] * 100
    t_wilson = [
        wilson_score_interval(r['delayed_count'], r['stops_count']) for _, r in train_agg.iterrows()
    ]
    train_agg['wilson_lower'] = [round(w[0] * 100, 2) for w in t_wilson]
    train_agg['wilson_upper'] = [round(w[1] * 100, 2) for w in t_wilson]

    top_tr_hotspots = train_agg.sort_values('wilson_lower', ascending=False).head(50).to_dict(orient='records')
    top_tr_punctual = train_agg.sort_values('wilson_upper', ascending=True).head(50).to_dict(orient='records')

    patterns_data = {
        "provenance": overview_data["provenance"],
        "definition": "Observed delay patterns reflect historical associations in the 19-day observed window. High delay rates indicate observed delay hotspots and platform bottlenecks, not physical causation.",
        "by_hour": hour_stats,
        "by_day_of_week": dow_stats,
        "by_position": pos_stats,
        "hotspots": {
            "stations": {
                "min_support_threshold": 100,
                "top_hotspots": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in top_stn_hotspots],
                "top_punctual": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in top_stn_punctual]
            },
            "trains": {
                "min_support_threshold": 50,
                "top_hotspots": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in top_tr_hotspots],
                "top_punctual": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()} for r in top_tr_punctual]
            }
        }
    }

    with open(SERVING_DIR / "patterns.json", "w", encoding="utf-8") as f:
        json.dump(patterns_data, f, indent=2)
    print("  [OK] Saved patterns.json")

    # -------------------------------------------------------------
    # 5. Build model_lab.json with Test Curves & Explanations
    # -------------------------------------------------------------
    with open(DOCS_DIR / "phase5_preflight.json", "r") as f:
        preflight_f = json.load(f)

    with open(EXPERIMENTS_DIR / "final_test_results.json", "r") as f:
        phase4_test = json.load(f)

    # Load test split probabilities for curve point generation
    test_dates = ["2026-10-23", "2026-10-24"]
    df_test_raw = load_parquet_dates(test_dates)
    df_test_el = df_test_raw[check_label_eligibility(df_test_raw)].copy()
    y_test = (df_test_el['arrival_delay_min'] > 15).astype(int).values

    eval_model = joblib.load(MODELS_DIR / "evaluation_model.joblib")
    calibrator = joblib.load(MODELS_DIR / "calibrator.joblib")
    hist_transformer = joblib.load(MODELS_DIR / "hist_transformer.joblib")

    with open(MODELS_DIR / "model_metadata.json", "r") as f:
        meta = json.load(f)

    X_test, _, _ = extract_features_and_target(df_test_raw, hist_transformer, filter_eligible=True)
    X_test = X_test[meta["feature_names"]]

    y_test_prob_raw = eval_model.predict(X_test)
    y_test_prob_calib = calibrator.predict(y_test_prob_raw)

    # Curve points for plotting in React Recharts
    # 1. PR Curve (downsampled to 60 points)
    prec_pts, rec_pts, _ = precision_recall_curve(y_test, y_test_prob_calib)
    pr_indices = np.linspace(0, len(prec_pts) - 1, 60).astype(int)
    pr_curve_data = [
        {"recall": round(float(rec_pts[i]), 3), "precision": round(float(prec_pts[i]), 3)}
        for i in pr_indices
    ]

    # 2. ROC Curve (downsampled to 60 points)
    fpr_pts, tpr_pts, _ = roc_curve(y_test, y_test_prob_calib)
    roc_indices = np.linspace(0, len(fpr_pts) - 1, 60).astype(int)
    roc_curve_data = [
        {"fpr": round(float(fpr_pts[i]), 3), "tpr": round(float(tpr_pts[i]), 3)}
        for i in roc_indices
    ]

    # 3. Calibration Reliability Curve (10 bins)
    bins = np.linspace(0.0, 1.0, 11)
    calib_curve_data = []
    for i in range(10):
        mask = (y_test_prob_calib >= bins[i]) & (y_test_prob_calib < bins[i+1]) if i < 9 else (y_test_prob_calib >= bins[i]) & (y_test_prob_calib <= bins[i+1])
        cnt = int(np.sum(mask))
        if cnt > 0:
            calib_curve_data.append({
                "bin_mid": round(float((bins[i] + bins[i+1]) / 2), 2),
                "predicted_prob": round(float(np.mean(y_test_prob_calib[mask])), 3),
                "observed_frequency": round(float(np.mean(y_test[mask])), 3),
                "samples_count": cnt
            })

    # Read simple English explanations
    with open(DOCS_DIR / "model" / "explanations_simple.md", "r", encoding="utf-8") as f:
        simple_explanations_text = f.read()

    # Feature Importance table
    fi_df = pd.read_csv(DOCS_DIR / "model" / "feature_importance.csv")
    feature_imp_list = fi_df.to_dict(orient='records')

    model_lab_data = {
        "provenance": overview_data["provenance"],
        "model_metadata": {
            "model_name": meta["model_name"],
            "version": meta["version"],
            "algorithm": "LightGBM Gradient Boosted Decision Trees + Isotonic Regression",
            "threshold": preflight_f["calibrated_thresholds"]["optimal_f1_threshold"],
            "recall80_threshold": preflight_f["calibrated_thresholds"]["recall80_threshold"],
            "best_iteration": meta["best_iteration"],
            "features_count": len(meta["feature_names"]),
            "banned_features": meta["banned_features"]
        },
        "model_comparison": preflight_f["average_precision_recomputed"],
        "lifts": preflight_f["lifts"],
        "final_test_metrics": phase4_test["test_metrics"]["lightgbm_calibrated"],
        "per_category_test": phase4_test["error_analysis"]["by_category"],
        "per_position_test": phase4_test["error_analysis"]["by_position"],
        "curves": {
            "precision_recall": pr_curve_data,
            "roc": roc_curve_data,
            "calibration_reliability": calib_curve_data
        },
        "feature_importance": feature_imp_list[:15],
        "simple_explanations_markdown": simple_explanations_text
    }

    with open(SERVING_DIR / "model_lab.json", "w", encoding="utf-8") as f:
        json.dump(model_lab_data, f, indent=2)
    print("  [OK] Saved model_lab.json")

    elapsed = time.time() - start_time
    print("=" * 70)
    print(f"Serving store successfully built in {elapsed:.1f}s!")
    print(f"  SQLite Database: {SQLITE_PATH} ({sqlite_size_mb:.2f} MB)")
    print(f"  JSON Files: overview.json, patterns.json, model_lab.json")
    print("=" * 70)


if __name__ == "__main__":
    build_serving_store()
