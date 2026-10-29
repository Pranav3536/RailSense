# RailSense — Dataset Split Design & Anti-Leakage Protocol

> **Document Status:** Formally Decided for Phase 3 & Mandatory for Phase 4  
> **Temporal Window:** 2026-10-07 to 2026-10-25 (19 days)  
> **Core Principle:** Strict temporal causal ordering with multi-day in-flight leakage prevention. Random $k$-fold cross-validation is strictly forbidden.

---

## 1. Temporal Partitioning Boundaries

The dataset spans 19 calendar days. We establish chronological non-overlapping boundaries based on the journey origin `start_date`:

| Partition | Date Range | Calendar Days | Run Count | Labelled Stops (approx) | Purpose & Usage Policy |
|-----------|------------|---------------|-----------|--------------------------|------------------------|
| **Warm-Up / Burn-In** | `2026-10-07` | 1 day | 1,034 | 18,792 | **Historical Lag Construction Only.** Left-truncated collection. Used strictly to populate rolling train statistics. Never used to fit model weights or calculate evaluation loss. |
| **Train Set** | `2026-10-08` to `2026-10-20` | 13 days | ~108,000 | ~1,300,000 | Model training, tree construction, probability calibration fitting. |
| **Validation Set** | `2026-10-21` to `2026-10-22` | 2 days | ~16,500 | ~200,000 | Hyperparameter tuning, early stopping, threshold calibration, and ensemble weighting. |
| **Test Set** | `2026-10-23` to `2026-10-24` | 2 days | ~16,000 | ~194,000 | Final untouched benchmark evaluation and portfolio metrics reporting. |
| **Excluded / Censored** | `2026-10-25` | 1 day | 5,712 | 53,957 | **Excluded from Evaluation.** Data collection was terminated at 23:08 IST while multi-day runs were in transit (right-censored). |

---

## 2. The Multi-Day In-Flight Journey Leakage Trap

A critical discovery during Phase 3 verification revealed that **413,907 stop observations (23.33% of all observed arrivals)** occur on calendar days *after* the train's journey `start_date` (spanning Day 2, Day 3, and Day 4 of long-distance routes).

### The Vulnerability
If an engineer computes rolling historical features for a train departing on `2026-10-15` by filtering historical database records where `start_date < '2026-10-15'`, that query will mistakenly include stops from a train that departed on `2026-10-14` but did not arrive until `2026-10-16`. Using observations from October 16th to predict a departure on October 15th constitutes **temporal lookahead leakage**.

### Anti-Leakage Protocol
To guarantee 100% causal integrity:
1. **Journey-Level Partitioning:** Every run `(train_number, start_date)` is assigned in its entirety to a single partition based on `start_date`. No single journey is ever split across Train, Val, or Test.
2. **Feature Computation Cutoff:** When building historical rolling statistics for a train scheduled to depart on date $D$ at time $T$, any historical observation used in the aggregate must strictly satisfy:
   $$\text{actual\_arrival\_time} < \text{scheduled\_departure\_origin}(D)$$
   In practice, for daily batch feature generation, we enforce:
   $$\text{actual\_arrival} < D \text{ (00:00:00 IST)}$$

---

## 3. Rolling-Origin Temporal Cross-Validation Scheme

To evaluate model stability across time without random data leakage, Phase 4 utilizes an expanding-window (rolling-origin) temporal cross-validation protocol:

```
Fold 1: [ Train: Oct 08 - Oct 16 (9 days)  ] -> [ Val: Oct 17 - Oct 18 (2 days) ]
Fold 2: [ Train: Oct 08 - Oct 18 (11 days) ] -> [ Val: Oct 19 - Oct 20 (2 days) ]
Fold 3: [ Train: Oct 08 - Oct 20 (13 days) ] -> [ Val: Oct 21 - Oct 22 (2 days) ]
Final:  [ Train: Oct 08 - Oct 22 (15 days) ] -> [ Test: Oct 23 - Oct 24 (2 days) ]
```

- **Expanding Window:** Training data expands progressively, mirroring real-world railway production deployments where past operational history accumulates continuously.
- **Fixed Horizon:** Validation and Test horizons are fixed at 2 days each, matching the practical operational lookahead required for passenger trip planning.

---

## 4. Cold-Start & Unseen Entity Smoothing Policy

Indian Railways operates special, diverted, and non-daily trains. In the Test split, certain train numbers or small wayside stations may have zero prior observations in the training window.

### Policy Rules
1. **Never Drop Test Rows:** Predictions must be produced for every valid test stop observation.
2. **Empirical Bayesian / Laplace Smoothing:**
   For a high-cardinality categorical feature (e.g. `train_number` historical delay rate $\hat{p}_{\text{train}}$):
   $$\hat{p}_{\text{smoothed}} = \frac{n \cdot \bar{y}_{\text{train}} + m \cdot \bar{y}_{\text{category}}}{n + m}$$
   where $n$ is the number of historical observations for that train, $m$ is the smoothing weight (e.g. $m = 10$), and $\bar{y}_{\text{category}}$ is the empirical delay rate of the train's broad category (`SUB`, `MEX`, `SUF`, etc.).
3. **Global Fallback:** If the category itself has insufficient support, fallback to the global dataset prior $\bar{y}_{\text{global}} = 0.4992$.
