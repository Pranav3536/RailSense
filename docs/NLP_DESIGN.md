# Smart Insights: Local NLP Architecture & Design

**Module:** Smart Insights (Tab 6 Natural Language Analytics)  
**Implementation:** `backend/app/nlp/`  
**License / Cost:** 100% Free, zero external APIs, zero GPU requirements, runs locally in Python  

---

## 1. Design Principles & Anti-Hallucination Guarantees

1. **Zero Runtime LLMs:** No OpenAI, Anthropic, Gemini, Hugging Face, or local transformer models are called at request time.
2. **Deterministic Parameterised Templates:** Answers are produced strictly by parameterised formatting functions (`backend/app/nlp/templates.py`) reading directly from the precomputed serving store (`ServingClient` and SQLite). User text is **never** concatenated into SQL queries.
3. **Strict Pre-Departure Prediction Boundary:** Smart Insights answers historical analytical queries only. Forward delay prediction is prohibited in the chat interface and immediately redirected to Tab 3 (`/predict`).
4. **Strict Non-Causal Ground Rule:** The platform refuses to attribute physical causation (fog, weather, track maintenance, congestion). Queries seeking causes trigger `causal_refusal` explaining that observational data establishes statistical correlations only.
5. **Privacy First:** Raw query text is **never written to disk or logs**. Only SHA-256 query hashes, query character lengths, classified intent codes, confidence scores, and execution latency are recorded.

---

## 2. Pipeline Architecture

```
User Question (HTTP POST /api/insights/query)
     │
     ▼
1. Query Normalizer (backend/app/nlp/normalizer.py)
   - Strip control characters
   - Validate length (1 to 300 characters; HTTP 422 if invalid)
     │
     ▼
2. Entity Extractor (backend/app/nlp/entities.py)
   - Train Number: 5-digit regex validated against in-memory catalog
   - Train Name: RapidFuzz token matching against unique train names (threshold >= 82)
   - Station Code: Length 2-4 uppercase token OR token following cue words ("at", "station") validated against station catalog
   - Category: 20 service codes (SUB, MEX, SUF, RAJ, etc.) with Hinglish alias mapping
   - Temporal Entities: IST arrival hours (0-23), weekdays (Monday-Sunday), time buckets (morning, night)
   - Ranking Directives: Top-N (1-20), ranking order (top/bottom), minimum support bounds
     │
     ▼
3. Intent Classifier (backend/app/nlp/classifier.py)
   - Feature Extraction: Scikit-learn TF-IDF Vectorizer (word n-grams 1-2 + char n-grams 3-5)
   - Classification: Logistic Regression (C=5.0) over 19 discrete intents
   - Confidence Calculation: Softmax probability + margin between top-1 and top-2
   - Out-of-Distribution Guard: Fallback intent if confidence < 0.40 or margin < 0.08
     │
     ▼
4. Template Response Engine (backend/app/nlp/templates.py)
   - Query serving SQLite store or in-memory analytics JSON via ServingClient
   - Populate structured response envelope (answer text, visual type, visual data, definition note, caveats, deep link)
     │
     ▼
JSON Response Envelope (HTTP 200)
```

---

## 3. Intent Taxonomy (19 Discrete Intents)

| # | Intent Code | Description | Visual Type | Example Query |
|---|---|---|---|---|
| 1 | `fleet_summary` | Overall fleet delay rate and volume | KPI | "What is the overall punctuality across Indian Railways?" |
| 2 | `fleet_delay_dist` | Delay distribution across buckets | Table | "What is the distribution of delays across trains?" |
| 3 | `category_ranking` | Ranked delay rates across train categories | Table | "Which train category is most delayed?" |
| 4 | `category_detail` | Punctuality statistics for a specific category | KPI | "How punctual are Rajdhani trains?" |
| 5 | `compare_categories` | Side-by-side comparison of two categories | Table | "Compare Suburban vs Express delays" |
| 6 | `hour_pattern` | Hourly delay pattern across 0-23 IST | Table | "What time of day are trains most delayed?" |
| 7 | `dow_pattern` | Weekday delay variation | Table | "Which day of the week has the worst delays?" |
| 8 | `position_pattern` | Delay rate by journey sequence bucket | Table | "Do trains get more delayed deeper into their journey?" |
| 9 | `station_hotspots` | Top worst or most punctual stations | Table | "Which stations are the worst delay hotspots?" |
| 10 | `train_hotspots` | Top worst or most punctual trains | Table | "Which trains have the highest delay rate?" |
| 11 | `train_summary` | Overall historical profile for a train | KPI | "Tell me about train 12951" |
| 12 | `train_worst_stops` | Worst delayed calling stops for a train | Table | "What are the worst stops for train 12951?" |
| 13 | `station_summary` | Overall historical profile for a station | KPI | "How punctual is NDLS station?" |
| 14 | `station_calling_trains` | Calling trains sample for a station | Table | "Which trains stop at BRC station?" |
| 15 | `daily_trend` | Day-by-day delay trend (Oct 7-25) | Table | "How did delay rates change day by day?" |
| 16 | `model_overview` | ML model architecture and evaluation metrics | KPI | "What ML model is used and how accurate is it?" |
| 17 | `predict_redirect` | Future trip delay queries | Redirect | "Will train 12951 be delayed tomorrow?" |
| 18 | `causal_refusal` | Inquiries on physical causes of delay | Refusal | "Why is Indian Railways late due to fog?" |
| 19 | `out_of_scope` | Non-delay queries (booking, PNR, catering) | Refusal | "How can I book a tatkal ticket?" |

---

## 4. Empirical Evaluation Results

Evaluated on held-out test split (`backend/app/nlp/eval/questions.jsonl`, 131 test questions, 87 dev questions):

| Model / Baseline | Test Intent Accuracy | Test Macro-F1 | Median Latency (ms) |
|---|---|---|---|
| Keyword Matcher Baseline | 22.90% | 0.2335 | 0.12 ms |
| TF-IDF + Nearest Centroid | 90.08% | 0.9047 | 0.85 ms |
| **TF-IDF + Logistic Regression (Deployed)** | **93.89%** | **0.9410** | **1.14 ms** |

- **Entity Extraction Accuracy:** 93.33% across held-out queries.
- **Out-of-Distribution Fallback Trigger Rate:** 100.0% on out-of-scope booking, catering, and PNR questions.
- **Inference Latency:** Sub-1.5 ms per query, enabling fast responses with zero external API latency.
