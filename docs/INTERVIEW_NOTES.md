# RailSense — Data Science & ML Engineering Interview Notes

> **Target Roles:** Fresher / Junior Data Scientist, Machine Learning Engineer, Applied AI Engineer  
> **Key Focus:** Genuine data engineering, leakage prevention, statistical honesty, calibration, and production serving.

---

## 1. "Tell me about RailSense" (The 2-Minute Elevator Pitch)

"RailSense is an Indian Railways delay intelligence and prediction platform built over an observed dataset of 2.8 million train arrival records across 10,743 trains and 3,184 stations.

Most portfolio ML projects either use synthetic datasets or run random train/test splits that leak the future. With RailSense, my goal was to build a genuinely production-grade ML platform:
- I established a **strict temporal evaluation protocol** across chronological partitions, identifying and solving the *In-Flight Multi-Day Trap* where long-haul trains cross calendar boundaries.
- I banned 6 post-hoc operational features that appear in the raw database but represent catastrophic leakage at schedule time.
- I trained a **LightGBM Gradient Boosted Decision Tree** model achieving **0.8482 Average Precision (PR-AUC)**, delivering a **+72.4% relative lift** over the majority baseline and a **+4.95% lift** over strong 7-day train historical priors.
- I calibrated model probabilities using **Isotonic Regression**, cutting Expected Calibration Error by **69.7%** (from 0.0307 to 0.0093).
- To make the platform interactive and accessible without cloud bills, I engineered a **100% free, zero-LLM local NLP engine** that runs in 1.5ms on standard CPU with parameterised SQL templates, and deployed the entire architecture across Vercel and Render's free tier with zero runtime database credentials."

---

## 2. Deep Dive: Machine Learning & Statistical Decisions

### Q: Why LightGBM instead of XGBoost, CatBoost, or Deep Learning?
- **Speed & Memory Footprint:** LightGBM uses histogram-based binning (`max_bin=255`) and leaf-wise (best-first) tree growth. It trained in ~42 seconds on 1.3M training rows and evaluates a single inference request in **2.1 milliseconds** on CPU with an RSS footprint under 180 MB.
- **Tabular Data Superiority:** On tabular data with heterogeneous features (cyclical trigonometric angles, log-transformed sequence positions, empirical Bayesian smoothed priors), tree-based gradient boosting consistently matches or outperforms neural networks without requiring complex GPU hosting or slow embeddings.
- **Explainability:** LightGBM integrates natively with `TreeExplainer` in SHAP, allowing exact polynomial-time Shapley value attribution for every individual prediction without sampling approximations.

---

### Q: What is the "In-Flight Multi-Day Trap" and how did you prevent leakage?
- **The Problem:** Indian Railways operates numerous long-haul express routes (e.g., Dibrugarh–Kanyakumari Vivek Express, Kerala Express) that travel for 3 to 4 days across thousands of kilometers. In our dataset, **23.33% of train stop observations occur on subsequent calendar days**.
- If you split data strictly by the stop's calendar timestamp (`arrival_time < cutoff`), a train departing on October 20 that arrives at its destination on October 23 would have its early journey stops in the training set and its late journey stops in the test set. The model would "know" that the train had already departed and could leak intermediate operational status.
- **The Solution:** We defined a train run uniquely as `(train_number, start_date)`. A run is partitioned strictly by its **journey origin departure date**. Furthermore, rolling historical features (e.g., 7-day train punctuality) enforced $\text{actual\_arrival} < \text{split\_cutoff\_date}$, ensuring that only fully completed runs prior to the split boundary could inform historical priors.

---

### Q: Why did you calibrate probabilities with Isotonic Regression?
- **Why Raw Tree Outputs Aren't Probabilities:** Boosted decision trees minimize log loss or cross-entropy, pushing predicted scores toward 0 and 1. While the relative rank ordering is preserved (giving a high ROC-AUC), the raw sigmoid outputs do not match true empirical probabilities.
- **Why Isotonic over Platt (Sigmoid) Scaling:** Platt scaling fits a parametric logistic curve ($1 / (1 + e^{Ax + B})$). It assumes the uncalibrated scores have a sigmoid distortion. In our validation split, the distortion was non-linear with asymmetric over-confidence in the 0.60–0.80 range. Isotonic regression fits a non-parametric, monotonic step function.
- **The Result:** On the held-out test split of 194,000 stops, Isotonic calibration reduced the **Expected Calibration Error (ECE)** from **0.0307 to 0.0093** (a 69.7% reduction) and achieved a Brier score of **0.1536**, meaning a predicted 40% delay probability genuinely corresponds to a 40% observed historical frequency.

---

### Q: Why Average Precision (AP) instead of ROC-AUC or Accuracy?
- **Class Balance & Metric Truthfulness:** Arrival delays (> 15 minutes) occur on 49.2% of test stops. In asymmetric settings or threshold optimization, ROC-AUC can be misleading because false positive rate includes all true negatives. Precision-Recall curves focus directly on positive class performance.
- **The Trapezoid PR-AUC Artifact:** In scikit-learn, computing PR-AUC via `auc(recall, precision)` creates a diagonal line on constant baselines connecting $(0, 1.0)$ to $(1, p)$, artificially inflating the area to $\frac{1 + p}{2} \approx 0.7460$. Using `sklearn.metrics.average_precision_score` properly weights precision by recall increments, correctly evaluating constant predictors to their true positive prevalence ($0.4920$).

---

### Q: What banned features did you exclude and why?
Raw operational databases often store real-time telemetry alongside static schedules:
- `actual_arrival` and `actual_departure`: Future knowledge.
- `departure_delay_min`: At pre-departure schedule time, the departure delay at intermediate stops is unknown.
- `arrival_reported`, `status`, `run_quality`: Post-hoc operational audit flags logged only after train completion.
- *Strict Rule:* In Phase 4, we permanently barred these 6 columns from model ingestion. The schedule-time model accepts **only features knowable before departure** (timetable hour, day of week, route sequence position, train category, and rolling 7-day empirical priors).

---

## 3. Deep Dive: Software & System Architecture

### Q: Why build a local NLP engine without an LLM (OpenAI / Claude / Gemini)?
1. **Cost & Privacy:** A portfolio project should not require a paid API subscription or credit card to operate indefinitely.
2. **Sub-2ms Determinism:** LLMs introduce 500ms–2000ms network latency and cost per token. Our local pipeline (word + character n-gram TF-IDF into Logistic Regression) classifies user intent in **1.5 milliseconds** on standard CPU.
3. **Zero SQL Injection / Hallucination:** Rather than generating free-form SQL text that could hallucinate invalid table schemas or execute destructive queries, our NLP engine maps queries to **19 predefined parameterised templates**. If an entity cannot be extracted with high confidence, the system safely falls back to interactive suggestion chips.

---

### Q: How did you permanently detach TiDB Cloud from runtime?
- TiDB Cloud Serverless is excellent for large-scale data storage and audit queries. However, running aggregate queries across 2.8M rows at request time over WAN introduces 200–800ms network latency and consumes database query quotas.
- In **Phase 8.5**, we built an offline compilation script (`build_serving_data.py`) that exports precomputed analytical aggregates to static JSON files and builds an indexed, 40.89 MB SQLite database (`serving.sqlite`) storing train timetables and stop statistics.
- The Flask backend connects to this SQLite database in **read-only URI mode** (`file:...mode=ro`). The web application runs completely offline without any database connection string or credentials in cloud hosting.

---

### Q: How do you handle Render's free tier sleep cycle?
- Render free tier puts web services to sleep after 15 minutes of inactivity. When a user visits after an idle period, the first request takes ~40–50 seconds while the container spins up.
- Rather than leaving the user with a broken UI or spinning wheel, the RailSense frontend registers custom event listeners on API requests. If a fetch request remains pending for **$> 4.0\text{ seconds}$**, a visible, accessible `WakeUpNotice` banner slides down explaining that the free server is spinning up, automatically disappearing as soon as data arrives.

---

## 4. "What would you improve with more time or resources?"

1. **Weather & Monsoon Telemetry:** While our model achieves 0.8482 AP using timetable and historical signals, major non-linear delay shocks in India occur during severe monsoon downpours and winter fog in the Indo-Gangetic plain. Ingesting open-source satellite meteorological forecasts would significantly enhance December–January delay forecasts.
2. **Network Topology & Graph Neural Networks (GNN):** Delays on single-track lines propagate backward to subsequent trains traveling in the opposite direction. Modeling junction networks as a directed graph would capture cascade effects across crossing trains.
3. **Formulation 2 Live Production Deployment:** We developed and benchmarked Formulation 2 (en-route dynamic inference using current departure delay), achieving **0.9289 AP**. Connecting to live GPS APIs (e.g., National Train Enquiry System) would enable dynamic mid-journey updates for passengers currently traveling onboard.
