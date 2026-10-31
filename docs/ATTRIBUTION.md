# RailSense — Dataset Provenance & Third-Party Attribution

> **Purpose:** Transparent documentation of underlying data sources, licensing status, and open-source software libraries.

---

## 1. Dataset Provenance & Attribution

The empirical data powering RailSense originates from public observational records of Indian Railways train services:

- **Source Repository:** HuggingFace Hub: [`pjay-in/indian-railways-delays`](https://huggingface.co/datasets/pjay-in/indian-railways-delays)
- **Observed Volume:** 2,805,574 total stop observations across 10,743 train services and 3,184 stations.
- **Observed Temporal Window:** October 7, 2026 to October 25, 2026 (19 calendar days).
- **Label-Eligible Arrival Stops:** 1,773,068 arrival records (excluding sequence origin stops `seq=1`, unverified reporting flags, and multi-day data anomalies).
- **External Dataset License Status:** **UNVERIFIED** (sandboxed evaluation environment operates without external network access to resolve live HuggingFace dataset card metadata; users should consult the upstream dataset repository for commercial licensing status).
- **Disclaimer:** RailSense is an educational portfolio project and independent community intelligence platform. It is **not affiliated with, endorsed by, or operated by** the Ministry of Railways, Indian Railways (IR), or the Indian Railway Catering and Tourism Corporation (IRCTC).

---

## 2. Open-Source Software Dependencies

RailSense is built upon open-source libraries across the Python and JavaScript ecosystems:

### Machine Learning & Data Processing
- **LightGBM** (Microsoft) — Distributed gradient boosting framework under MIT License.
- **scikit-learn** (Pedregosa et al.) — Machine learning and IsotonicRegression calibration under BSD-3-Clause License.
- **SHAP** (Lundberg et al.) — Shapley Additive Explanations under MIT License.
- **RapidFuzz** (Bachmann et al.) — Fast string similarity and fuzzy extraction under MIT License.
- **NumPy & Pandas** — Core scientific computing and DataFrame manipulation under BSD-3-Clause License.
- **Joblib** — Model serialisation and fast disk persistence under BSD-3-Clause License.

### Backend Infrastructure
- **Flask & Flask-CORS** (Pallets Projects) — Lightweight WSGI web framework under BSD-3-Clause License.
- **Waitress** (Zope Foundation) — Production pure-Python WSGI server under ZPL 2.1 License.
- **Gunicorn** — Python WSGI HTTP Server under MIT License.
- **Werkzeug** (Pallets Projects) — WSGI web utility library (ProxyFix) under BSD-3-Clause License.
- **psutil** — Cross-platform process and system monitoring under BSD-3-Clause License.
- **pytest** — Testing framework under MIT License.

### Frontend Presentation & Analytics
- **React & React-DOM** (Meta Platforms) — Declarative UI library under MIT License.
- **Vite** (Evan You & Contributors) — Next-generation frontend build tool under MIT License.
- **Tailwind CSS** (Tailwind Labs) — Utility-first CSS framework under MIT License.
- **Recharts** — Composable charting library built on React components under MIT License.
- **Lucide React** (Lucide Contributors) — Clean, accessible SVG iconography under ISC License.
- **React Router** (Shopify / Remix Software) — Client-side SPA routing under MIT License.
- **Vitest & React Testing Library** — Unit and component testing frameworks under MIT License.
- **Playwright** (Microsoft) — Browser automation and end-to-end testing under Apache-2.0 License.
- **@axe-core/playwright** (Deque Systems) — Automated WCAG 2.1 accessibility auditing under MPL-2.0 License.

### Cloud Infrastructure
- **Render** — Cloud application hosting (Free Web Service tier).
- **Vercel** — Global Edge Network & static application hosting (Hobby tier).
