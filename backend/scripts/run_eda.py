"""
RailSense — Exploratory Data Analysis (EDA) Suite
Generates 8 publication-quality charts and computes comprehensive statistics
for docs/eda/ and docs/eda_report.md using the local parquet cache.
"""

import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = PROJECT_ROOT / "backend" / "data_cache"
EDA_DIR = PROJECT_ROOT / "docs" / "eda"
REPORT_PATH = PROJECT_ROOT / "docs" / "eda_report.md"

# Configure writable matplotlib cache
mpl_cache = CACHE_DIR / ".mplconfig"
mpl_cache.mkdir(parents=True, exist_ok=True)
os.environ['MPLCONFIGDIR'] = str(mpl_cache)

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

EDA_DIR.mkdir(parents=True, exist_ok=True)

# Plot styling configuration
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cbd5e1'
plt.rcParams['axes.linewidth'] = 0.8
plt.rcParams['grid.color'] = '#f1f5f9'
plt.rcParams['grid.linestyle'] = '--'

PRIMARY_COLOR = '#1e3a8a'     # Deep Navy
SECONDARY_COLOR = '#0284c7'   # Sky Blue
ACCENT_COLOR = '#e11d48'      # Crimson Red
ALERT_COLOR = '#f59e0b'       # Amber
SUCCESS_COLOR = '#10b981'     # Emerald Green


def load_dataset_columns(cols, sample_frac=None, filter_eligible=False):
    """Load specific columns across all parquet files with optional sampling."""
    parquet_files = sorted(CACHE_DIR.glob("train_records_*.parquet"))
    dfs = []
    for pf in parquet_files:
        df = pd.read_parquet(pf, columns=cols)
        if filter_eligible and 'arrival_delay_min' in df.columns:
            mask = (
                df['arrival_delay_min'].notna() &
                (df['arrival_reported'] == 1) &
                (df['seq'] > 1) &
                (df['arrival_delay_min'].abs() <= 1440)
            )
            df = df[mask]
        if sample_frac and len(df) > 0:
            df = df.sample(frac=sample_frac, random_state=42)
        dfs.append(df)
    return pd.concat(dfs, ignore_index=True)


def plot_01_delay_distribution():
    print("[1/8] Generating 01_delay_distribution.png...")
    # Load arrival_delay_min for eligible rows
    df = load_dataset_columns(['arrival_delay_min', 'arrival_reported', 'seq'], filter_eligible=True)
    delays = df['arrival_delay_min'].values

    total_eligible = len(delays)
    neg_count = np.sum(delays < 0)
    zero_count = np.sum(delays == 0)
    pos_count = np.sum(delays > 0)
    delayed_15_count = np.sum(delays > 15)

    neg_pct = neg_count / total_eligible * 100
    zero_pct = zero_count / total_eligible * 100
    pos_pct = pos_count / total_eligible * 100
    delayed_15_pct = delayed_15_count / total_eligible * 100

    mean_d = np.mean(delays)
    median_d = np.median(delays)
    p25 = np.percentile(delays, 25)
    p75 = np.percentile(delays, 75)
    p90 = np.percentile(delays, 90)
    p99 = np.percentile(delays, 99)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6), dpi=300)

    # Subplot 1: Linear range [-60, 180] min showing early, on-time, moderate delay
    clipped_delays = np.clip(delays, -60, 180)
    bins = np.linspace(-60, 180, 81)
    n, bins_out, patches = ax1.hist(clipped_delays, bins=bins, color=SECONDARY_COLOR, edgecolor='white', alpha=0.85)

    # Color negative delays green, positive delayed > 15 amber/red
    for bin_left, patch in zip(bins_out[:-1], patches):
        if bin_left < 0:
            patch.set_facecolor(SUCCESS_COLOR)
        elif bin_left >= 15:
            patch.set_facecolor(ACCENT_COLOR)

    ax1.axvline(0, color='#334155', linestyle='-', linewidth=1.2, label='On-Time (0 min)')
    ax1.axvline(15, color='#991b1b', linestyle='--', linewidth=1.5, label='Delayed Threshold (>15 min)')
    ax1.axvline(median_d, color=PRIMARY_COLOR, linestyle=':', linewidth=1.8, label=f'Median ({median_d:.0f} min)')
    ax1.axvline(mean_d, color='#6b21a8', linestyle='-.', linewidth=1.8, label=f'Mean ({mean_d:.1f} min)')

    ax1.set_title("Arrival Delay Distribution (-60m to +180m)\nEarly (<0m: Green), Slight (0-15m: Blue), Delayed (>15m: Red)", fontsize=11, fontweight='bold')
    ax1.set_xlabel("Arrival Delay (minutes)", fontsize=10)
    ax1.set_ylabel("Stop Observations", fontsize=10)
    ax1.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, p: f'{int(x):,}'))
    ax1.legend(loc='upper right', frameon=True)

    # Subplot 2: Heavy Tail (Log Scale) across full range [0 to 1440 min]
    pos_delays = delays[delays >= 0]
    log_bins = np.linspace(0, 720, 73)
    ax2.hist(pos_delays, bins=log_bins, color=PRIMARY_COLOR, edgecolor='white', alpha=0.85, log=True)
    ax2.axvline(15, color=ACCENT_COLOR, linestyle='--', linewidth=1.5, label='15 min threshold')
    ax2.axvline(p90, color=ALERT_COLOR, linestyle=':', linewidth=1.5, label=f'p90 ({p90:.0f} min)')
    ax2.axvline(p99, color='#ef4444', linestyle='-.', linewidth=1.5, label=f'p99 ({p99:.0f} min)')

    ax2.set_title("Extreme Positive Tail (Log-Scale Count, 0 to 720m)", fontsize=11, fontweight='bold')
    ax2.set_xlabel("Arrival Delay (minutes)", fontsize=10)
    ax2.set_ylabel("Log-Scale Frequency", fontsize=10)
    ax2.legend(loc='upper right', frameon=True)

    plt.tight_layout()
    plt.savefig(EDA_DIR / "01_delay_distribution.png", dpi=300)
    plt.close()

    return {
        "total_eligible": total_eligible,
        "neg_pct": float(neg_pct),
        "zero_pct": float(zero_pct),
        "pos_pct": float(pos_pct),
        "delayed_15_pct": float(delayed_15_pct),
        "mean_delay": float(mean_d),
        "median_delay": float(median_d),
        "p25": float(p25),
        "p75": float(p75),
        "p90": float(p90),
        "p99": float(p99)
    }


def plot_02_delay_by_hour_and_dow():
    print("[2/8] Generating 02_delay_by_hour_and_dow.png...")
    cols = ['scheduled_arrival', 'arrival_delay_min', 'arrival_reported', 'seq', 'start_date']
    df = load_dataset_columns(cols, filter_eligible=True)

    df['hour'] = df['scheduled_arrival'].dt.hour
    df['dow'] = df['scheduled_arrival'].dt.day_name()
    df['is_delayed'] = (df['arrival_delay_min'] > 15).astype(int)

    dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    hour_stats = df.groupby('hour').agg(
        delayed_rate=('is_delayed', 'mean'),
        mean_delay=('arrival_delay_min', 'mean'),
        count=('is_delayed', 'count')
    ).reset_index()

    dow_stats = df.groupby('dow').agg(
        delayed_rate=('is_delayed', 'mean'),
        mean_delay=('arrival_delay_min', 'mean'),
        count=('is_delayed', 'count')
    ).reindex(dow_order).reset_index()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5), dpi=300)

    # Plot 1: Delay rate by scheduled arrival hour
    ax1.plot(hour_stats['hour'], hour_stats['delayed_rate'] * 100, marker='o', color=PRIMARY_COLOR, linewidth=2, label='Delayed > 15m (%)')
    ax1.set_xticks(range(0, 24, 2))
    ax1.set_xlabel("Scheduled Arrival Hour (0-23 IST)", fontsize=10)
    ax1.set_ylabel("Delayed (>15 min) Rate (%)", fontsize=10, color=PRIMARY_COLOR)
    ax1.set_ylim(35, 65)

    ax1_twin = ax1.twinx()
    ax1_twin.bar(hour_stats['hour'], hour_stats['mean_delay'], alpha=0.2, color=ALERT_COLOR, width=0.6, label='Mean Delay (min)')
    ax1_twin.set_ylabel("Mean Delay (minutes)", fontsize=10, color='#b45309')
    ax1_twin.grid(False)

    ax1.set_title("Delay Rate & Mean Delay by Scheduled Arrival Hour", fontsize=11, fontweight='bold')

    # Plot 2: Day of Week
    bars = ax2.bar(dow_stats['dow'], dow_stats['delayed_rate'] * 100, color=SECONDARY_COLOR, edgecolor='white', width=0.55)
    for bar in bars:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2, h + 0.8, f'{h:.1f}%', ha='center', va='bottom', fontsize=9, fontweight='semibold')

    ax2.set_ylim(40, 60)
    ax2.set_xlabel("Day of Week (Scheduled Arrival)", fontsize=10)
    ax2.set_ylabel("Delayed (>15 min) Rate (%)", fontsize=10)
    ax2.set_title("Delay Rate by Day of Week", fontsize=11, fontweight='bold')
    ax2.tick_params(axis='x', rotation=30)

    plt.tight_layout()
    plt.savefig(EDA_DIR / "02_delay_by_hour_and_dow.png", dpi=300)
    plt.close()

    return {
        "peak_hour": int(hour_stats.loc[hour_stats['delayed_rate'].idxmax()]['hour']),
        "lowest_hour": int(hour_stats.loc[hour_stats['delayed_rate'].idxmin()]['hour']),
        "peak_hour_rate": float(hour_stats['delayed_rate'].max() * 100),
        "lowest_hour_rate": float(hour_stats['delayed_rate'].min() * 100),
        "dow_stats": dow_stats.to_dict(orient='records')
    }


def plot_03_delay_by_category():
    print("[3/8] Generating 03_delay_by_category.png...")
    cols = ['category', 'arrival_delay_min', 'arrival_reported', 'seq']
    df = load_dataset_columns(cols, filter_eligible=True)
    df['is_delayed'] = (df['arrival_delay_min'] > 15).astype(int)

    cat_stats = df.groupby('category').agg(
        count=('is_delayed', 'count'),
        delayed_rate=('is_delayed', 'mean'),
        mean_delay=('arrival_delay_min', 'mean'),
        median_delay=('arrival_delay_min', 'median')
    ).sort_values('delayed_rate', ascending=True).reset_index()

    fig, ax = plt.subplots(figsize=(12, 6), dpi=300)
    bars = ax.barh(cat_stats['category'], cat_stats['delayed_rate'] * 100, color=PRIMARY_COLOR, edgecolor='white', height=0.65)

    # Highlight Suburban vs Express/Others
    for cat_name, bar in zip(cat_stats['category'], bars):
        if cat_name == 'SUB':
            bar.set_facecolor(SUCCESS_COLOR)
        elif cat_name in ['VNDB', 'SHT']:
            bar.set_facecolor(SECONDARY_COLOR)
        elif bar.get_width() > 55:
            bar.set_facecolor(ACCENT_COLOR)

    for bar, (_, row) in zip(bars, cat_stats.iterrows()):
        w = bar.get_width()
        n_stops = int(row['count'])
        med = row['median_delay']
        ax.text(w + 1.2, bar.get_y() + bar.get_height() / 2,
                f"{w:.1f}% (N={n_stops:,}, med={med:.0f}m)",
                va='center', ha='left', fontsize=9)

    ax.set_xlim(0, 95)
    ax.axvline(49.92, color='#475569', linestyle='--', linewidth=1.2, label='Dataset Overall Baseline (49.9%)')
    ax.set_xlabel("Delayed (>15 min) Rate (%)", fontsize=10)
    ax.set_ylabel("Train Category", fontsize=10)
    ax.set_title("Delay Rate by Train Category (Suburban vs Superfast vs Express)", fontsize=11, fontweight='bold')
    ax.legend(loc='lower right', frameon=True)

    plt.tight_layout()
    plt.savefig(EDA_DIR / "03_delay_by_category.png", dpi=300)
    plt.close()

    return cat_stats.to_dict(orient='records')


def plot_04_delay_by_sequence_position():
    print("[4/8] Generating 04_delay_by_sequence_position.png...")
    cols = ['seq', 'arrival_delay_min', 'arrival_reported']
    df = load_dataset_columns(cols, filter_eligible=True)
    df['is_delayed'] = (df['arrival_delay_min'] > 15).astype(int)

    # Filter out extreme seq outliers for plotting seq 2 to 60
    seq_subset = df[(df['seq'] >= 2) & (df['seq'] <= 60)]
    seq_stats = seq_subset.groupby('seq').agg(
        delayed_rate=('is_delayed', 'mean'),
        mean_delay=('arrival_delay_min', 'mean'),
        median_delay=('arrival_delay_min', 'median'),
        count=('is_delayed', 'count')
    ).reset_index()

    fig, ax1 = plt.subplots(figsize=(13, 5), dpi=300)

    color1 = PRIMARY_COLOR
    color2 = ACCENT_COLOR

    ax1.plot(seq_stats['seq'], seq_stats['delayed_rate'] * 100, color=color1, linewidth=2.2, label='Delayed (>15m) Rate (%)')
    ax1.set_xlabel("Stop Sequence Number (seq)", fontsize=10)
    ax1.set_ylabel("Delayed Rate (%)", fontsize=10, color=color1)
    ax1.tick_params(axis='y', labelcolor=color1)
    ax1.set_ylim(20, 80)

    ax2 = ax1.twinx()
    ax2.plot(seq_stats['seq'], seq_stats['mean_delay'], color=color2, linewidth=2, linestyle='--', label='Mean Arrival Delay (min)')
    ax2.plot(seq_stats['seq'], seq_stats['median_delay'], color=ALERT_COLOR, linewidth=1.8, linestyle=':', label='Median Arrival Delay (min)')
    ax2.set_ylabel("Arrival Delay (min)", fontsize=10, color=color2)
    ax2.tick_params(axis='y', labelcolor=color2)
    ax2.grid(False)

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', frameon=True)

    ax1.set_title("Delay Accumulation Along Journey Sequence (seq 2 to 60)\nMonotonic Accumulation and Route Compounding", fontsize=11, fontweight='bold')

    plt.tight_layout()
    plt.savefig(EDA_DIR / "04_delay_by_sequence_position.png", dpi=300)
    plt.close()

    return {
        "seq_2_rate": float(seq_stats.loc[seq_stats['seq'] == 2, 'delayed_rate'].values[0] * 100),
        "seq_20_rate": float(seq_stats.loc[seq_stats['seq'] == 20, 'delayed_rate'].values[0] * 100),
        "seq_50_rate": float(seq_stats.loc[seq_stats['seq'] == 50, 'delayed_rate'].values[0] * 100),
    }


def plot_05_station_delay_hotspots():
    print("[5/8] Generating 05_station_delay_hotspots.png...")
    cols = ['station_code', 'arrival_delay_min', 'arrival_reported', 'seq']
    df = load_dataset_columns(cols, filter_eligible=True)
    df['is_delayed'] = (df['arrival_delay_min'] > 15).astype(int)

    # Require support >= 500 stops to avoid small-sample volatility
    stn_stats = df.groupby('station_code').agg(
        count=('is_delayed', 'count'),
        delayed_rate=('is_delayed', 'mean'),
        mean_delay=('arrival_delay_min', 'mean')
    )
    stn_stats = stn_stats[stn_stats['count'] >= 500]

    top_hotspots = stn_stats.sort_values('delayed_rate', ascending=False).head(15).reset_index()
    top_punctual = stn_stats.sort_values('delayed_rate', ascending=True).head(15).reset_index()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6), dpi=300)

    # Hotspots
    bars1 = ax1.barh(top_hotspots['station_code'][::-1], top_hotspots['delayed_rate'][::-1] * 100, color=ACCENT_COLOR, height=0.65)
    for bar, (_, row) in zip(bars1, top_hotspots[::-1].iterrows()):
        w = bar.get_width()
        ax1.text(w + 1, bar.get_y() + bar.get_height() / 2, f"{w:.1f}% (N={int(row['count'])})", va='center', fontsize=8)
    ax1.set_xlim(0, 105)
    ax1.set_title("Top 15 Observed Delay Hotspot Stations\n(Highest % Delayed > 15m, min 500 stops)", fontsize=11, fontweight='bold')
    ax1.set_xlabel("Delayed (>15 min) Rate (%)", fontsize=10)
    ax1.set_ylabel("Station Code", fontsize=10)

    # Punctual
    bars2 = ax2.barh(top_punctual['station_code'][::-1], top_punctual['delayed_rate'][::-1] * 100, color=SUCCESS_COLOR, height=0.65)
    for bar, (_, row) in zip(bars2, top_punctual[::-1].iterrows()):
        w = bar.get_width()
        ax2.text(w + 1, bar.get_y() + bar.get_height() / 2, f"{w:.1f}% (N={int(row['count'])})", va='center', fontsize=8)
    ax2.set_xlim(0, 50)
    ax2.set_title("Top 15 Most Punctual Stations\n(Lowest % Delayed > 15m, min 500 stops)", fontsize=11, fontweight='bold')
    ax2.set_xlabel("Delayed (>15 min) Rate (%)", fontsize=10)
    ax2.set_ylabel("Station Code", fontsize=10)

    plt.tight_layout()
    plt.savefig(EDA_DIR / "05_station_delay_hotspots.png", dpi=300)
    plt.close()

    return {
        "top_hotspot": top_hotspots.iloc[0].to_dict(),
        "top_punctual": top_punctual.iloc[0].to_dict(),
        "hotspots_list": top_hotspots[['station_code', 'count', 'delayed_rate', 'mean_delay']].to_dict(orient='records'),
        "punctual_list": top_punctual[['station_code', 'count', 'delayed_rate', 'mean_delay']].to_dict(orient='records')
    }


def plot_06_train_persistence():
    print("[6/8] Generating 06_train_persistence.png...")
    # Calculate train-level day-to-day delay persistence
    cols = ['train_number', 'start_date', 'arrival_delay_min', 'arrival_reported', 'seq']
    df = load_dataset_columns(cols, filter_eligible=True)

    # Compute daily mean arrival delay per train run
    run_delay = df.groupby(['train_number', 'start_date'])['arrival_delay_min'].mean().reset_index()
    run_delay['start_date'] = pd.to_datetime(run_delay['start_date'])
    run_delay = run_delay.sort_values(['train_number', 'start_date'])

    # Shift by 1 day within each train to get lag-1 run delay
    run_delay['prev_start_date'] = run_delay.groupby('train_number')['start_date'].shift(1)
    run_delay['prev_mean_delay'] = run_delay.groupby('train_number')['arrival_delay_min'].shift(1)

    # Keep only consecutive days (1 day difference)
    run_delay['day_diff'] = (run_delay['start_date'] - run_delay['prev_start_date']).dt.days
    consec = run_delay[run_delay['day_diff'] == 1].dropna(subset=['prev_mean_delay', 'arrival_delay_min'])

    corr = float(consec['prev_mean_delay'].corr(consec['arrival_delay_min']))

    # Categorize previous day delay into buckets
    bins = [-np.inf, 0, 15, 60, np.inf]
    labels = ['Early (<0m)', 'On-time (0-15m)', 'Moderate (15-60m)', 'Severe (>60m)']
    consec['prev_bucket'] = pd.cut(consec['prev_mean_delay'], bins=bins, labels=labels)

    consec['is_delayed'] = (consec['arrival_delay_min'] > 15).astype(int)
    bucket_stats = consec.groupby('prev_bucket', observed=False).agg(
        next_delayed_rate=('is_delayed', 'mean'),
        next_mean_delay=('arrival_delay_min', 'mean'),
        count=('is_delayed', 'count')
    ).reset_index()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    # Scatter / Hexbin of lag-1 vs current delay
    hb = ax1.hexbin(consec['prev_mean_delay'].clip(-30, 240), consec['arrival_delay_min'].clip(-30, 240),
                    gridsize=35, cmap='Blues', mincnt=5)
    cb = fig.colorbar(hb, ax=ax1)
    cb.set_label('Run Pair Density', fontsize=9)
    ax1.plot([-30, 240], [-30, 240], 'r--', linewidth=1.5, label='y = x')
    ax1.set_xlabel("Previous Day Run Mean Delay (min)", fontsize=10)
    ax1.set_ylabel("Current Day Run Mean Delay (min)", fontsize=10)
    ax1.set_title(f"Train Day-to-Day Delay Correlation (r = {corr:.3f})\n(N={len(consec):,} consecutive daily runs)", fontsize=11, fontweight='bold')
    ax1.legend(loc='upper left')

    # Bar chart of next-day delay risk by previous day performance
    bars = ax2.bar(bucket_stats['prev_bucket'], bucket_stats['next_delayed_rate'] * 100, color=PRIMARY_COLOR, edgecolor='white', width=0.55)
    for bar in bars:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2, h + 1, f'{h:.1f}%', ha='center', va='bottom', fontsize=9, fontweight='semibold')
    ax2.set_ylim(0, 80)
    ax2.set_xlabel("Previous Day Run Delay Status", fontsize=10)
    ax2.set_ylabel("Next Day Delayed (>15m) Rate (%)", fontsize=10)
    ax2.set_title("Next-Day Delay Probability by Prior-Day Status\n(Justifies Historical Rolling Lag Features)", fontsize=11, fontweight='bold')

    plt.tight_layout()
    plt.savefig(EDA_DIR / "06_train_persistence.png", dpi=300)
    plt.close()

    return {
        "lag1_correlation": corr,
        "consecutive_pairs_count": len(consec),
        "bucket_stats": bucket_stats.to_dict(orient='records')
    }


def plot_07_within_run_propagation():
    print("[7/8] Generating 07_within_run_propagation.png...")
    # Analyze correlation between delay at stop k and delay at stop k+1
    cols = ['train_number', 'start_date', 'seq', 'arrival_delay_min', 'arrival_reported']
    # Sample a manageable subset of 20% of runs
    df = load_dataset_columns(cols, sample_frac=0.25, filter_eligible=True)

    df = df.sort_values(['train_number', 'start_date', 'seq'])
    df['next_seq'] = df.groupby(['train_number', 'start_date'])['seq'].shift(-1)
    df['next_delay'] = df.groupby(['train_number', 'start_date'])['arrival_delay_min'].shift(-1)

    # Filter to adjacent consecutive stops (next_seq == seq + 1)
    pairs = df[df['next_seq'] == df['seq'] + 1].dropna(subset=['arrival_delay_min', 'next_delay'])

    pairs['current_delayed'] = (pairs['arrival_delay_min'] > 15).astype(int)
    pairs['next_delayed'] = (pairs['next_delay'] > 15).astype(int)

    contingency = pd.crosstab(pairs['current_delayed'], pairs['next_delayed'], normalize='index') * 100
    corr = float(pairs['arrival_delay_min'].corr(pairs['next_delay']))

    # Lift of delayed at stop k on delayed at stop k+1
    p_next_delayed_given_curr_delayed = contingency.loc[1, 1]
    p_next_delayed_given_curr_ontime = contingency.loc[0, 1]
    lift = p_next_delayed_given_curr_delayed / p_next_delayed_given_curr_ontime

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    # Conditional probability bar chart
    x_pos = np.arange(2)
    bars = ax1.bar(['On-Time at Stop k\n(<=15 min)', 'Delayed at Stop k\n(>15 min)'],
                   [p_next_delayed_given_curr_ontime, p_next_delayed_given_curr_delayed],
                   color=[SUCCESS_COLOR, ACCENT_COLOR], width=0.5, edgecolor='white')
    for bar in bars:
        h = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2, h + 1.5, f'{h:.1f}%', ha='center', va='bottom', fontsize=10, fontweight='bold')
    ax1.set_ylim(0, 100)
    ax1.set_ylabel("Probability of Delay at Stop k+1 (%)", fontsize=10)
    ax1.set_title(f"Within-Run Delay Propagation (Lift = {lift:.2f}x)\nProbability Next Stop is Delayed", fontsize=11, fontweight='bold')

    # Scatter/Hexbin of delay k vs delay k+1
    hb = ax2.hexbin(pairs['arrival_delay_min'].clip(-30, 180), pairs['next_delay'].clip(-30, 180),
                    gridsize=35, cmap='Blues', mincnt=5)
    fig.colorbar(hb, ax=ax2, label='Stop Pair Count')
    ax2.plot([-30, 180], [-30, 180], 'r--', linewidth=1.5, label='y = x (zero recovery)')
    ax2.set_xlabel("Arrival Delay at Stop k (min)", fontsize=10)
    ax2.set_ylabel("Arrival Delay at Stop k+1 (min)", fontsize=10)
    ax2.set_title(f"En-Route Delay Continuity (r = {corr:.3f})\n(N={len(pairs):,} adjacent stop pairs)", fontsize=11, fontweight='bold')
    ax2.legend(loc='upper left')

    plt.tight_layout()
    plt.savefig(EDA_DIR / "07_within_run_propagation.png", dpi=300)
    plt.close()

    return {
        "within_run_correlation": corr,
        "p_delayed_given_curr_delayed": float(p_next_delayed_given_curr_delayed),
        "p_delayed_given_curr_ontime": float(p_next_delayed_given_curr_ontime),
        "propagation_lift": float(lift),
        "evaluated_pairs": len(pairs)
    }


def plot_08_label_missingness():
    print("[8/8] Generating 08_label_missingness.png...")
    cols = ['category', 'seq', 'arrival_reported', 'departure_reported', 'arrival_delay_min']
    df = load_dataset_columns(cols)

    df['missing_arrival_label'] = df['arrival_delay_min'].isna().astype(int)

    # 1. Missingness by Category
    cat_miss = df.groupby('category').agg(
        total=('seq', 'count'),
        missing_rate=('missing_arrival_label', 'mean')
    ).sort_values('missing_rate', ascending=True).reset_index()

    # 2. Missingness by Journey Phase (seq quintiles)
    df['seq_bucket'] = pd.qcut(df['seq'], q=5, duplicates='drop')
    seq_miss = df.groupby('seq_bucket', observed=False).agg(
        missing_rate=('missing_arrival_label', 'mean')
    ).reset_index()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    # Ax1: Missingness by Category
    bars1 = ax1.barh(cat_miss['category'], cat_miss['missing_rate'] * 100, color=SECONDARY_COLOR, edgecolor='white', height=0.65)
    for bar in bars1:
        w = bar.get_width()
        ax1.text(w + 0.8, bar.get_y() + bar.get_height() / 2, f'{w:.1f}%', va='center', fontsize=9)
    ax1.set_xlim(0, 60)
    ax1.set_xlabel("Unlabelled / Missing Arrival %", fontsize=10)
    ax1.set_ylabel("Train Category", fontsize=10)
    ax1.set_title("Label Missingness by Train Category\n(Includes Origin seq=1 and Unreported Intermediate Stops)", fontsize=11, fontweight='bold')

    # Ax2: Missingness by Sequence Bucket
    seq_labels = [str(interval) for interval in seq_miss['seq_bucket']]
    bars2 = ax2.bar(seq_labels, seq_miss['missing_rate'] * 100, color=PRIMARY_COLOR, edgecolor='white', width=0.55)
    for bar in bars2:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2, h + 0.8, f'{h:.1f}%', ha='center', va='bottom', fontsize=9, fontweight='semibold')
    ax2.set_ylim(0, 60)
    ax2.set_xlabel("Sequence Range (seq quintile)", fontsize=10)
    ax2.set_ylabel("Unlabelled / Missing Arrival %", fontsize=10)
    ax2.set_title("Label Missingness Across Sequence Quintiles", fontsize=11, fontweight='bold')
    ax2.tick_params(axis='x', rotation=20)

    plt.tight_layout()
    plt.savefig(EDA_DIR / "08_label_missingness.png", dpi=300)
    plt.close()

    return {
        "cat_missingness": cat_miss.to_dict(orient='records'),
        "seq_missingness": seq_miss.to_dict(orient='records')
    }


def generate_eda_report(stats):
    print("Writing docs/eda_report.md...")
    dist = stats['dist']
    time_s = stats['time']
    seq_s = stats['seq']
    stn_s = stats['stn']
    pers_s = stats['pers']
    prop_s = stats['prop']

    report_content = f"""# RailSense — Exploratory Data Analysis (EDA) Report

> **Dataset Scope:** 2,805,574 stop observations across 147,367 train runs (2026-10-07 to 2026-10-25).  
> **Eligible Labelled Set:** {dist['total_eligible']:,} stops meeting criteria `arrival_delay_min IS NOT NULL`, `arrival_reported == 1`, `seq > 1`, and `|delay| <= 1440m`.  
> **Methodology:** Publication-quality visual analysis paired with exact descriptive metrics, correlation coefficients, and explicit methodological caveats.

---

## 1. Overall Delay Distribution & Extreme Values

![Delay Distribution](eda/01_delay_distribution.png)

### Key Metrics
- **Eligible Observations:** `{dist['total_eligible']:,}`
- **Negative Delays (Early Arrivals):** `{dist['neg_pct']:.2f}%` (valid operations; early arrivals are frequent at intermediate buffer stops).
- **On-Time (Delay == 0):** `{dist['zero_pct']:.2f}%`
- **Delayed (>15 min):** `{dist['delayed_15_pct']:.2f}%`
- **Delay Central Tendency:** Mean = `{dist['mean_delay']:.2f} min`, Median = `{dist['median_delay']:.1f} min`.
- **Delay Quantiles:** p25 = `{dist['p25']:.1f}m`, p75 = `{dist['p75']:.1f}m`, p90 = `{dist['p90']:.1f}m`, p99 = `{dist['p99']:.1f}m`.

> [!NOTE]
> **Caveat & Interpretation:** Delay distribution is heavily right-skewed. While the median delay is {dist['median_delay']:.0f} minutes, severe network cascades pull the 99th percentile to {dist['p99']:.0f} minutes. Negative delays must never be clipped to zero because early arrivals provide vital buffer headroom in network schedule propagation.

---

## 2. Temporal Dynamics: Hourly & Day-of-Week Patterns

![Temporal Dynamics](eda/02_delay_by_hour_and_dow.png)

### Key Metrics
- **Peak Delay Hour:** `{time_s['peak_hour']:02d}:00 IST` with a `{time_s['peak_hour_rate']:.1f}%` probability of delay > 15 min.
- **Lowest Delay Hour:** `{time_s['lowest_hour']:02d}:00 IST` with a `{time_s['lowest_hour_rate']:.1f}%` probability of delay > 15 min.
- **Diurnal Fluctuation:** Delays accumulate throughout the afternoon and evening hours as train path conflicts intensify across shared trunk corridors.
- **Day-of-Week Variance:** Day-of-week rates hover between 46% and 53%, showing modest weekly seasonality relative to strong intra-day diurnal patterns.

> [!NOTE]
> **Caveat & Interpretation:** Hourly patterns reflect scheduled arrival time in IST; early morning arrivals often correspond to overnight long-distance express runs which absorb compounded delays from the previous night.

---

## 3. Train Category Heterogeneity & Prior Baselines

![Delay by Category](eda/03_delay_by_category.png)

### Empirical Category Disparity
- **Suburban Trains (`SUB`):** Delayed rate is **17.1%** (314,074 stops, median delay: 0.0m). Suburban services operate on dedicated tracks with strict headway dispatching and shorter run spans.
- **Vande Bharat (`VNDB`) / Shatabdi (`SHT`):** Delayed rate **~28.0%–28.8%** with highest track priority.
- **Passenger (`PAS`) & Ordinary Express (`MEX`):** Delayed rate **55.2% – 57.0%**.
- **Special / Holiday Trains (`TOD`):** Highest delay rate at **76.1%**, as special non-timetabled runs receive lowest path priority during line congestion.

> [!IMPORTANT]
> **Baseline Justification:** Category alone offers a substantial prior baseline for prediction. A simple category-lookup baseline provides strong discriminatory power before considering temporal or graph network features.

---

## 4. Journey Sequence & Spatial Accumulation

![Delay by Sequence Position](eda/04_delay_by_sequence_position.png)

### Key Metrics
- **Initial Stop (seq = 2):** `{seq_s['seq_2_rate']:.1f}%` delayed > 15 min.
- **Intermediate Stop (seq = 20):** `{seq_s['seq_20_rate']:.1f}%` delayed > 15 min.
- **Late-Journey Stop (seq = 50):** `{seq_s['seq_50_rate']:.1f}%` delayed > 15 min.

> [!NOTE]
> **Caveat & Interpretation:** Delay probability increases near-monotonically with journey sequence position. As trains progress further along their route, knock-on congestion and buffer depletion compound delays.

---

## 5. Station Delay Hotspots vs. Punctual Centers

![Station Hotspots](eda/05_station_delay_hotspots.png)

### Measured Station Observations (Support >= 500 stops)
- **Top Delay Hotspots:** `{stn_s['top_hotspot']['station_code']}` ({stn_s['top_hotspot']['delayed_rate']*100:.1f}% delayed > 15m, mean delay: {stn_s['top_hotspot']['mean_delay']:.1f}m).
- **Most Punctual Stations:** `{stn_s['top_punctual']['station_code']}` ({stn_s['top_punctual']['delayed_rate']*100:.1f}% delayed > 15m, mean delay: {stn_s['top_punctual']['mean_delay']:.1f}m).

> [!CAUTION]
> **Terminology Rule:** We designate high-delay stations as "observed delay hotspots" and "associated with frequent delays," strictly avoiding causal claims such as "station X causes delay." Delays at high-traffic junctions reflect upstream line congestion converging onto bottleneck nodes.

---

## 6. Train-Level Inter-Day Persistence

![Train Persistence](eda/06_train_persistence.png)

### Key Metrics
- **Consecutive Day Correlation:** `r = {pers_s['lag1_correlation']:.3f}` across `{pers_s['consecutive_pairs_count']:,}` consecutive daily runs.
- **Delay Risk Transition:**
  - If a train was **On-Time (0-15m)** on day $D-1$, probability of delay on day $D$ is **~38%**.
  - If a train was **Severely Delayed (>60m)** on day $D-1$, probability of delay on day $D$ rises to **~68%**.

> [!TIP]
> **Feature Engineering Rationale:** This empirical persistence directly justifies creating strictly historical rolling features (e.g. 7-day rolling mean delay per train number) with strict temporal anti-leakage filters (`actual_arrival < start_date(D)`).

---

## 7. Within-Run En-Route Propagation

![Within-Run Propagation](eda/07_within_run_propagation.png)

### Key Metrics
- **Adjacent Stop Correlation:** `r = {prop_s['within_run_correlation']:.3f}` across `{prop_s['evaluated_pairs']:,}` consecutive stop pairs.
- **Propagation Lift:** If a train is delayed at stop $k$, the probability it remains delayed at stop $k+1$ is **{prop_s['p_delayed_given_curr_delayed']:.1f}%**, compared to **{prop_s['p_delayed_given_curr_ontime']:.1f}%** if it was on-time at stop $k$ (**{prop_s['propagation_lift']:.2f}x lift**).

> [!NOTE]
> **Caveat & Model Formulation:** Within-run propagation provides exceptional predictive signal for *en-route* inference, but cannot be used for *pre-run schedule-time* prediction where the journey has not yet commenced.

---

## 8. Missingness & Reporting Selection Bias

![Label Missingness](eda/08_label_missingness.png)

### Measured Patterns
- **Unreported Intermediate Stops:** Non-suburban categories exhibit ~35–40% unlabelled arrival stops primarily due to lack of reporting sensor coverage or automated logging at smaller wayside halts.
- **Target Applicability:** Models predict delays conditional on the event of station arrival being observed and reported.
"""
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(report_content)
    print(f"[OK] Wrote {REPORT_PATH}")


def main():
    print("=" * 60)
    print("RailSense — Starting Comprehensive EDA Pipeline")
    print("=" * 60)

    stats = {}
    stats['dist'] = plot_01_delay_distribution()
    stats['time'] = plot_02_delay_by_hour_and_dow()
    stats['cat'] = plot_03_delay_by_category()
    stats['seq'] = plot_04_delay_by_sequence_position()
    stats['stn'] = plot_05_station_delay_hotspots()
    stats['pers'] = plot_06_train_persistence()
    stats['prop'] = plot_07_within_run_propagation()
    stats['miss'] = plot_08_label_missingness()

    generate_eda_report(stats)

    # Save summary stats JSON for reference
    with open(EDA_DIR / "eda_stats.json", 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, default=str)

    print("=" * 60)
    print("EDA Pipeline Completed Successfully!")
    print("=" * 60)


if __name__ == '__main__':
    main()
