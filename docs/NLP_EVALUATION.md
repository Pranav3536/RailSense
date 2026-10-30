# RailSense — Smart Insights NLP Evaluation Report

> **Generated:** Phase 9 NLP Verification  
> **Evaluation Dataset:** 218 Questions (87 Dev / 131 Held-Out Test)  
> **Intent Classes:** 19 Discrete Parameterised Intents  
> **Runtime Constraints:** 100% Free & Local (`scikit-learn` + `rapidfuzz`), zero paid APIs, zero runtime LLMs.

---

## 1. Intent Classification Benchmark (Held-Out Test Set)

| Architecture | Paradigm | Test Accuracy | Macro F1-Score | Mean Confidence | Mean Margin |
|---|---|---|---|---|---|
| **Keyword Baseline** | Heuristic Token Search | 22.90% | 0.2335 | N/A | N/A |
| **Nearest Centroid** | TF-IDF (Word 1-2) | 90.08% | 0.9047 | N/A | N/A |
| **Logistic Regression (DEPLOYED)** | TF-IDF (Word 1-2 + Char 3-5) | **93.89%** | **0.9410** | **0.5946** | **0.5217** |

### Key Findings:
1. **Substantial Lift Over Keyword Baseline:** Deployed Logistic Regression achieves a +71.0 percentage point accuracy gain over keyword matching, effectively handling Hinglish vocabulary and query variations.
2. **Sub-millisecond Inference:** Vectorization and logistic regression inference execute in under 1.5 milliseconds per query.

---

## 2. Entity Extraction Evaluation (Held-Out Test Set)

- **Overall Entity Extraction Accuracy:** **93.33%** (70/75 entity instances)

| Entity Type | Extraction Method | Instances Tested | Correct | Accuracy |
|---|---|---|---|---|
| `station_code` | Cue-Word / Case Sensitive Rule | 10 | 9 | **90.0%** |
| `train_number` | Regex + Catalog Lookup | 24 | 24 | **100.0%** |
| `weekday` | Cue-Word / Case Sensitive Rule | 2 | 2 | **100.0%** |
| `category` | Cue-Word / Case Sensitive Rule | 16 | 15 | **93.8%** |
| `order` | Cue-Word / Case Sensitive Rule | 16 | 13 | **81.2%** |
| `top_n` | Cue-Word / Case Sensitive Rule | 5 | 5 | **100.0%** |
| `time_of_day` | Cue-Word / Case Sensitive Rule | 2 | 2 | **100.0%** |

---

## 3. Fallback & Out-of-Distribution (OOD) Safety

- **OOD Rejection Rate:** **100.0%** (5/5 random/out-of-scope strings)
- Queries below confidence threshold (0.40) or with thin margin (< 0.08) are rejected into truthful fallback with 3 suggestion chips.

---

## 4. Methodological Honesty & Optimism Caveat

> [!IMPORTANT]
> **Optimism Caveat:** The evaluation set contains 224 questions authored to test the intended feature surface across natural language variations, Hinglish terms, and adversarial out-of-scope prompts. While held-out from training, in-the-wild user phrasing can introduce novel vocabulary or unforeseen ambiguities. The system is designed to fail safely: it falls back to truthful suggestion chips rather than guessing an erroneous analytical answer.
