# RailSense — Feature Catalog & Leakage Prevention Protocol

> **Document Status:** Formally Decided for Phase 3 & Mandatory for Phase 4 Modeling  
> **Core Principle:** Temporal causality. Features must be computable in production at schedule-time without access to future observations or post-hoc journey metadata.

---

## 1. Feature Taxonomy & Operational Availability

| Category | Description | Operational Availability | Allowed in Phase 4 Benchmark |
|----------|-------------|--------------------------|------------------------------|
| **Schedule-Time Features** | Deterministic timetable attributes known at ticket booking or schedule publication. | At any time prior to departure | **YES** (Core feature set) |
| **Historical Rolling Features** | Aggregated performance metrics of trains, routes, and stations computed strictly prior to journey start. | At journey origin departure | **YES** (Strict temporal filter) |
| **En-Route Features** | Real-time tracking signals (delay observed at stop $k$ to predict stop $k+1$). | Only while train is en-route | **SECONDARY ONLY** (Marked En-Route) |
| **BANNED / Leakage Features** | Post-hoc labels, timestamps from current or future stops, or target derivations. | Post-journey only | **STRICTLY FORBIDDEN** |

---

## 2. Schedule-Time (Pre-Run) Features

These features require only the scheduled timetable and can be evaluated days or weeks in advance:

| Feature Name | Type | Description | Formula / Transformation |
|--------------|------|-------------|--------------------------|
| `scheduled_hour` | Numeric (0–23) | Hour of scheduled arrival in IST. | `scheduled_arrival.dt.hour` |
| `sin_hour`, `cos_hour` | Numeric (Continuous) | Cyclical trigonometric encoding of the 24-hour diurnal cycle. | $\sin(2\pi \cdot \text{hour}/24)$, $\cos(2\pi \cdot \text{hour}/24)$ |
| `day_of_week` | Categorical | Day of week for scheduled arrival. | `scheduled_arrival.dt.day_name()` |
| `sin_dow`, `cos_dow` | Numeric (Continuous) | Cyclical trigonometric encoding of the 7-day weekly cycle. | $\sin(2\pi \cdot \text{dow}/7)$, $\cos(2\pi \cdot \text{dow}/7)$ |
| `is_weekend` | Binary (0/1) | Weekend flag (Saturday or Sunday). | $\mathbb{I}(\text{day\_of\_week} \in \{\text{Sat}, \text{Sun}\})$ |
| `is_night` | Binary (0/1) | Night arrival flag (22:00 to 06:00 IST). | $\mathbb{I}(\text{hour} \ge 22 \lor \text{hour} < 6)$ |
| `seq` | Numeric (Integer) | Stop sequence index along the journey route. | Direct integer from timetable. |
| `log_seq` | Numeric (Continuous) | Logarithmic sequence position reflecting sub-linear delay compounding. | $\ln(\text{seq})$ |
| `is_origin_adjacent` | Binary (0/1) | Early journey phase flag (`seq <= 3`). | $\mathbb{I}(\text{seq} \le 3)$ |
| `is_deep_journey` | Binary (0/1) | Compounded delay territory flag (`seq >= 25`). | $\mathbb{I}(\text{seq} \ge 25)$ |
| `category` | Categorical | Broad train class (`SUB`, `MEX`, `SUF`, `PAS`, `TOD`, etc.). | One-hot encoded or Target-encoded. |
| `category_prior_delayed_rate` | Numeric [0, 1] | Historical delay rate for the train category. | Empirical lookup baseline prior. |

---

## 3. Historical Rolling Features (Strictly Anti-Leakage)

To reflect real-world train health and network congestion without lookahead bias, rolling statistics are computed strictly over completed trips prior to origin date $D$:

$$\mathcal{H}(D) = \{ \text{stop } s \mid \text{actual\_arrival}_s < D \text{ (00:00:00 IST)} \}$$

| Feature Name | Type | Historical Horizon | Description & Smoothing Formula |
|--------------|------|--------------------|---------------------------------|
| `train_hist_delay_rate_7d` | Numeric [0, 1] | Trailing 7 days | Empirical Bayesian smoothed delay probability for `train_number`: $\frac{n \bar{y}_{\text{train}} + 10 \cdot \bar{y}_{\text{cat}}}{n + 10}$ |
| `train_hist_mean_delay_7d` | Numeric (Minutes) | Trailing 7 days | Smoothed average arrival delay for `train_number`: $\frac{n \bar{d}_{\text{train}} + 10 \cdot \bar{d}_{\text{cat}}}{n + 10}$ |
| `station_hist_delay_rate_7d` | Numeric [0, 1] | Trailing 7 days | Smoothed historical delay rate at `station_code`: $\frac{n \bar{y}_{\text{stn}} + 20 \cdot \bar{y}_{\text{global}}}{n + 20}$ |
| `station_hist_mean_delay_7d` | Numeric (Minutes) | Trailing 7 days | Smoothed average delay at `station_code`: $\frac{n \bar{d}_{\text{stn}} + 20 \cdot \bar{d}_{\text{global}}}{n + 20}$ |

---

## 4. Banned & Leakage Features (Strictly Forbidden)

The following columns exist in `train_records` or can be derived from the database, but are **strictly prohibited** from pre-run feature sets:

| Forbidden Column / Feature | Reason for Absolute Ban |
|----------------------------|-------------------------|
| `actual_arrival` | Target component; unknown until train actually arrives. |
| `actual_departure` | Target component / downstream event; unknown prior to departure. |
| `departure_delay_min` | Collinear with or downstream of arrival delay. |
| `arrival_reported` | Downstream reporting status flag. |
| `departure_reported` | Downstream reporting status flag. |
| `status` | Post-hoc journey status (`ARRIVED`, `CANCELLED`, etc.) logged after completion. |
| `run_quality` | Post-hoc summary quality score calculated after trip termination. |
| In-Flight Same-Day Data | Stops occurring on day $D$ from trains still in transit. |
| Target Lag within Same Run | Current stop cannot use same stop's delay; en-route models must explicitly restrict to stop $k < \text{current } seq$. |
