# RailSense — Model Explanations in Plain English

> **Audience:** Non-technical passengers, railway operators, and portfolio reviewers.  
> **Key Rule:** Machine learning models identify **observed statistical associations**, not physical or operational causes.

---

## What Drives the Model's Delay Predictions?

Our LightGBM model looks at four major categories of timetable and historical information to estimate whether your train will arrive late by more than 15 minutes:

### 1. Train Historical Performance (`train_hist_delay_rate`, `train_hist_mean_delay`)
- **What it means:** How often this exact train was late over the previous 7 completed days.
- **Why it matters:** In Indian Railways, certain rakes (train compositions) run consecutive daily schedules across congested corridors. A train with a history of persistent delays has a substantially higher probability of facing schedule disruptions today.

### 2. Station Operational Congestion (`station_hist_delay_rate`, `station_hist_mean_delay`)
- **What it means:** The observed historical delay frequency at your arrival station.
- **Why it matters:** Major junction stations handle intersecting trunk lines, passenger connections, and platform bottlenecks. High-traffic junction stations are observed delay hotspots.

### 3. Train Category & Track Priority (`category`, `category_prior_rate`)
- **What it means:** The official classification of the service (Suburban `SUB`, Vande Bharat `VNDB`, Superfast `SUF`, Express `MEX`, Special `TOD`).
- **Why it matters:** Indian Railways dispatchers operate under strict operational path precedence:
  - **Suburban (`SUB`):** Dedicated tracks and strict suburban schedules mean Suburban trains arrive punctually 83% of the time.
  - **Special / Holiday (`TOD`):** Unscheduled holiday specials receive lower line priority and are observed late 76% of the time.

### 4. Journey Sequence Position (`seq`, `log_seq`, `is_deep_journey`)
- **What it means:** How far along its route the train currently is (e.g. stop #3 vs stop #45).
- **Why it matters:** Timetable buffers are gradually absorbed over hundreds of kilometers. Trains near the beginning of their route are frequently punctual; trains past stop #30 accumulate compounded route delays.

---

## When is the Model Most Reliable?

1. **High Confidence Predictions:**
   - **Suburban Trains:** Predicts on-time arrivals with >90% precision.
   - **Late Journey Superfasts:** High accuracy in identifying compound delay cascades once a train enters multi-state trunk routes.

2. **Model Limitations & Weaknesses:**
   - **Cold-Start Trains:** Rare, newly numbered holiday specials with zero 7-day prior history rely strictly on category-level priors.
   - **Early-Morning Long Hauls:** Express trains scheduled between 02:00 and 05:00 IST exhibit high variance due to overnight freight interleaving.
