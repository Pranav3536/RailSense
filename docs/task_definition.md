# RailSense — Machine Learning Prediction Task Formulation

> **Document Status:** Formally Decided for Phase 3 & Locked for Phase 4 Modeling  
> **Target Dataset:** RailSense `train_records` (2.8M stops, 147k runs)  
> **Key Principle:** Strict temporal causality; clear distinction between Schedule-Time (Pre-Run) vs En-Route Prediction.

---

## 1. Executive Summary & Problem Formulation

In Indian Railways operations, passenger anxiety and operational bottlenecks stem from unexpected schedule deviations. The objective of RailSense ML is to provide reliable, calibrated delay intelligence to passengers and railway analysts.

We formally define **two operational prediction paradigms**:
1. **Primary Formulation: Schedule-Time (Pre-Run) Delay Prediction**  
   - **Inference Timing:** Before the train journey commences ($t \le \text{origin departure}$ or user booking / schedule lookup).
   - **Available Information:** Timetable scheduled features (train category, scheduled time of day, day of week, journey sequence, route distance/sequence) + strictly historical lag statistics from completed prior journeys.
   - **Information Boundary:** Zero information about current trip execution is known.
2. **Secondary Formulation: En-Route Delay Propagation**  
   - **Inference Timing:** While the train is in transit, immediately after observing actual arrival/departure at stop $k$.
   - **Predictive Target:** Delay at downstream stop $k+m$ ($m \ge 1$).
   - **Available Information:** Schedule-time features + current cumulative delay at stop $k$.

Phase 4 model training and evaluation focuses primarily on the **Schedule-Time (Pre-Run) formulation**, as it represents the fundamental machine learning challenge with the highest user utility prior to travel.

---

## 2. Target Variable Definition

### Primary Target: Binary Delay Classification
$$\text{is\_delayed} = \begin{cases} 1 & \text{if } \text{arrival\_delay\_min} > 15 \\ 0 & \text{if } \text{arrival\_delay\_min} \le 15 \end{cases}$$

- **Operational Justification:** Indian Railways internal punctuality guidelines and passenger tolerance establish that arrival within 15 minutes of scheduled time is considered punctually acceptable ("on-time"). Delays exceeding 15 minutes trigger missed connections, passenger distress, and platform rescheduling.
- **Negative Delay Handling:** Negative arrival delays (early arrivals, e.g. -10 min) are valid operational realities. They fall cleanly into $\text{is\_delayed} = 0$. They are **never clipped or discarded**.
- **Class Balance:** In the eligible dataset, `is_delayed == 1` occurs in **49.92%** of cases (approximately 1:1 balance overall, with category-level variation from 17.1% in Suburban to 76.1% in Special trains).

### Secondary Target: Continuous Arrival Delay (Minutes)
$$y = \text{arrival\_delay\_min}$$
- Evaluated via Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) against baseline medians.
- Outlier robustness required: Huber loss or Quantile regression ($\tau = 0.5, 0.9$) to withstand long right-tail cascades without distortion.

---

## 3. Label Eligibility Masking (Validation Rules)

A stop observation row is eligible for inclusion in the training/validation/test label set if and only if:
1. `arrival_delay_min IS NOT NULL`
2. `arrival_reported == 1` (excludes corrupted or unverified records)
3. `seq > 1` (origin stops have no arrival event; `seq = 1` departure delay is an origin attribute)
4. `abs(arrival_delay_min) <= 1440` (excludes corrupt 24h+ date-wrap artifacts and logging errors; 211 rows total)

Rows with `arrival_reported == 0` or NULL arrival are **not** imputed with 0 or dropped from existence; they are preserved in the database and feature aggregations but masked out of evaluation loss calculations.

---

## 4. Evaluation Framework & Fixed Metrics

To prevent metric gaming and ensure rigorous portfolio presentation, models in Phase 4 must report the following fixed suite of metrics across test splits:

| Metric | Role in RailSense | Business & Technical Interpretation |
|--------|-------------------|--------------------------------------|
| **PR-AUC (Average Precision)** | **Primary Selection Metric** | Area under the Precision-Recall curve. Critical for evaluating performance across imbalanced sub-categories (e.g., Suburban at 17% vs Special at 76%). |
| **ROC-AUC** | Discrimination | Global ranking capability across discrimination thresholds. |
| **F1-Score (Macro & Positive)** | Balanced Accuracy | Harmonic mean of precision and recall at default 0.5 threshold and optimal threshold. |
| **Precision @ High Recall (Recall $\ge$ 0.80)** | Passenger Safety | Precision when catching at least 80% of delayed trains. |
| **Brier Score / Expected Calibration Error (ECE)** | Probability Calibration | Reliability of predicted delay probabilities for UI display (e.g. "70% chance of delay"). |
| **Log-Loss** | Probabilistic Fitness | Cross-entropy loss reflecting probability sharpness. |

---

## 5. Hierarchical Benchmark Baselines

No complex machine learning model (LightGBM, Random Forest, etc.) can be declared successful without rigorously outperforming simple, explainable baselines:

1. **Baseline 0: Global Majority Classifier**
   - Predicts the overall majority class label and global delay probability ($p = 0.499$).
2. **Baseline 1: Category-Prior Lookup**
   - Predicts delay probability strictly based on the train category empirical historical rate (e.g., $P(\text{delayed} \mid \text{SUB}) = 0.171$, $P(\text{delayed} \mid \text{TOD}) = 0.761$).
3. **Baseline 2: Train Historical Rolling Prior**
   - Predicts probability based on the specific train number's rolling mean delay over the prior 7 days.
4. **Baseline 3: Linear / Logistic Model**
   - Scikit-learn LogisticRegression with L2 regularization using standard one-hot and numerical features.
