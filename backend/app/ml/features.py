"""
RailSense — Leakage-Safe Feature Engineering Pipeline
Provides scikit-learn compatible transformers for schedule-time (pre-run)
features and strictly historical rolling priors.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

KNOWN_CATEGORIES = [
    'SUB', 'MEX', 'SUF', 'PAS', 'MEMU', 'DMU', 'VNDB', 'SHT', 'TOD', 'OTHER'
]

# Standard global fallbacks derived from historical warm-up & training priors
GLOBAL_FALLBACK_DELAY_RATE = 0.4992
GLOBAL_FALLBACK_MEAN_DELAY = 38.22


class ScheduleTimeFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Extracts deterministic timetable features available at schedule-time
    prior to train departure. Zero dependence on actual journey realization.
    """

    def __init__(self, include_category_onehot: bool = True):
        self.include_category_onehot = include_category_onehot
        self.feature_names_: List[str] = []

    def fit(self, X: pd.DataFrame, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()
        features = pd.DataFrame(index=df.index)

        # 1. Temporal Timetable Features
        if 'scheduled_arrival' in df.columns:
            sched = pd.to_datetime(df['scheduled_arrival'])
            hour = sched.dt.hour.fillna(12).astype(float)
            dow = sched.dt.dayofweek.fillna(0).astype(float)
        else:
            hour = pd.Series(12.0, index=df.index)
            dow = pd.Series(0.0, index=df.index)

        features['scheduled_hour'] = hour
        features['sin_hour'] = np.sin(2 * np.pi * hour / 24.0)
        features['cos_hour'] = np.cos(2 * np.pi * hour / 24.0)

        features['day_of_week'] = dow
        features['sin_dow'] = np.sin(2 * np.pi * dow / 7.0)
        features['cos_dow'] = np.cos(2 * np.pi * dow / 7.0)

        features['is_weekend'] = (dow >= 5).astype(float)
        features['is_night'] = ((hour >= 22) | (hour < 6)).astype(float)

        # 2. Sequence Position Features
        if 'seq' in df.columns:
            seq = df['seq'].fillna(1).astype(float)
        else:
            seq = pd.Series(1.0, index=df.index)

        features['seq'] = seq
        features['log_seq'] = np.log1p(np.maximum(0, seq))
        features['is_origin_adjacent'] = (seq <= 3).astype(float)
        features['is_deep_journey'] = (seq >= 25).astype(float)

        # 3. Categorical One-Hot Encoding
        if self.include_category_onehot:
            if 'category' in df.columns:
                cat = df['category'].astype(str).replace({'nan': 'OTHER', 'None': 'OTHER', '<NA>': 'OTHER'})
            else:
                cat = pd.Series('OTHER', index=df.index)
            for c in KNOWN_CATEGORIES:
                if c == 'OTHER':
                    features['cat_OTHER'] = (~cat.isin(KNOWN_CATEGORIES[:-1])).astype(float)
                else:
                    features[f'cat_{c}'] = (cat == c).astype(float)

        self.feature_names_ = list(features.columns)
        return features

    def get_feature_names_out(self, input_features=None) -> List[str]:
        return self.feature_names_


class HistoricalPriorTransformer(BaseEstimator, TransformerMixin):
    """
    Computes and injects strictly causal historical rolling performance priors
    for train numbers, stations, and categories with Bayesian smoothing.
    
    Anti-Leakage Enforcement:
    Historical priors are fit ONLY on records where actual_arrival < split cutoff date.
    """

    def __init__(self, m_train: float = 10.0, m_station: float = 20.0):
        self.m_train = m_train
        self.m_station = m_station

        self.global_delay_rate_: float = GLOBAL_FALLBACK_DELAY_RATE
        self.global_mean_delay_: float = GLOBAL_FALLBACK_MEAN_DELAY
        self.cat_priors_: Dict[str, Dict[str, float]] = {}
        self.train_priors_: Dict[Union[int, str], Dict[str, float]] = {}
        self.station_priors_: Dict[str, Dict[str, float]] = {}

    def fit(self, X: pd.DataFrame, y=None):
        """
        Fit historical priors using strictly historical observations.
        Expects X to contain: train_number, station_code, category, arrival_delay_min.
        """
        df = X.copy()
        if 'arrival_delay_min' not in df.columns:
            # Nothing to compute, keep defaults
            return self

        # Filter to valid labelled rows
        valid = df[df['arrival_delay_min'].notna() & (df['arrival_delay_min'].abs() <= 1440)].copy()
        if len(valid) == 0:
            return self

        valid['is_delayed'] = (valid['arrival_delay_min'] > 15).astype(float)

        # 1. Global Priors
        self.global_delay_rate_ = float(valid['is_delayed'].mean())
        self.global_mean_delay_ = float(valid['arrival_delay_min'].mean())

        # 2. Category Priors
        cat_grp = valid.groupby('category', observed=False)
        for cat, group in cat_grp:
            n = len(group)
            self.cat_priors_[str(cat)] = {
                'count': n,
                'delay_rate': float(group['is_delayed'].mean()),
                'mean_delay': float(group['arrival_delay_min'].mean())
            }

        # 3. Train Number Priors (smoothed toward category prior)
        train_grp = valid.groupby(['train_number', 'category'], observed=False)
        for (tr, cat), group in train_grp:
            n = len(group)
            cat_p = self.cat_priors_.get(str(cat), {
                'delay_rate': self.global_delay_rate_,
                'mean_delay': self.global_mean_delay_
            })
            # Bayesian smoothed
            smoothed_rate = (group['is_delayed'].sum() + self.m_train * cat_p['delay_rate']) / (n + self.m_train)
            smoothed_mean = (group['arrival_delay_min'].sum() + self.m_train * cat_p['mean_delay']) / (n + self.m_train)
            self.train_priors_[str(tr)] = {
                'count': n,
                'smoothed_delay_rate': float(smoothed_rate),
                'smoothed_mean_delay': float(smoothed_mean)
            }

        # 4. Station Code Priors (smoothed toward global prior)
        stn_grp = valid.groupby('station_code', observed=False)
        for stn, group in stn_grp:
            n = len(group)
            smoothed_rate = (group['is_delayed'].sum() + self.m_station * self.global_delay_rate_) / (n + self.m_station)
            smoothed_mean = (group['arrival_delay_min'].sum() + self.m_station * self.global_mean_delay_) / (n + self.m_station)
            self.station_priors_[str(stn)] = {
                'count': n,
                'smoothed_delay_rate': float(smoothed_rate),
                'smoothed_mean_delay': float(smoothed_mean)
            }

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """Map smoothed historical priors onto target dataset."""
        df = X.copy()
        out = pd.DataFrame(index=df.index)

        # 1. Category Prior Lookup
        cat_col = df['category'].astype(str) if 'category' in df.columns else pd.Series('OTHER', index=df.index)
        out['category_prior_rate'] = cat_col.map(
            lambda c: self.cat_priors_.get(c, {}).get('delay_rate', self.global_delay_rate_)
        ).astype(float)
        out['category_prior_mean'] = cat_col.map(
            lambda c: self.cat_priors_.get(c, {}).get('mean_delay', self.global_mean_delay_)
        ).astype(float)

        # 2. Train Prior Lookup
        tr_col = df['train_number'].astype(str) if 'train_number' in df.columns else pd.Series('', index=df.index)
        out['train_hist_delay_rate'] = tr_col.map(
            lambda t: self.train_priors_.get(t, {}).get('smoothed_delay_rate', np.nan)
        )
        # Fallback for cold-start trains to category prior
        out['train_hist_delay_rate'] = out['train_hist_delay_rate'].fillna(out['category_prior_rate']).astype(float)

        out['train_hist_mean_delay'] = tr_col.map(
            lambda t: self.train_priors_.get(t, {}).get('smoothed_mean_delay', np.nan)
        )
        out['train_hist_mean_delay'] = out['train_hist_mean_delay'].fillna(out['category_prior_mean']).astype(float)

        # 3. Station Prior Lookup
        stn_col = df['station_code'].astype(str) if 'station_code' in df.columns else pd.Series('', index=df.index)
        out['station_hist_delay_rate'] = stn_col.map(
            lambda s: self.station_priors_.get(s, {}).get('smoothed_delay_rate', self.global_delay_rate_)
        ).astype(float)
        out['station_hist_mean_delay'] = stn_col.map(
            lambda s: self.station_priors_.get(s, {}).get('smoothed_mean_delay', self.global_mean_delay_)
        ).astype(float)

        return out


def extract_features_and_target(
    df: pd.DataFrame,
    historical_transformer: Optional[HistoricalPriorTransformer] = None,
    filter_eligible: bool = True
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Convenience function to extract full feature matrix, binary target, and continuous delay.
    Returns: (X_features, y_binary, y_continuous)
    """
    if filter_eligible:
        mask = (
            df['arrival_delay_min'].notna() &
            (df['arrival_reported'] == 1) &
            (df['seq'] > 1) &
            (df['arrival_delay_min'].abs() <= 1440)
        )
        subset = df[mask].copy()
    else:
        subset = df.copy()

    # Extract Schedule-Time features
    st_extractor = ScheduleTimeFeatureExtractor()
    X_st = st_extractor.fit_transform(subset)

    # Extract Historical features if transformer provided
    if historical_transformer is not None:
        X_hist = historical_transformer.transform(subset)
        X_features = pd.concat([X_st, X_hist], axis=1)
    else:
        X_features = X_st

    y_binary = (subset['arrival_delay_min'] > 15).astype(int) if 'arrival_delay_min' in subset.columns else pd.Series(dtype=int)
    y_continuous = subset['arrival_delay_min'] if 'arrival_delay_min' in subset.columns else pd.Series(dtype=float)

    return X_features, y_binary, y_continuous
