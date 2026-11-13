# RailSense — Security Posture & Hardening Document

> **Status:** Production Hardened (Phase 10 Integration QA)  
> **Classification:** Public Analytical Platform  
> **Runtime Isolation:** Read-Only SQLite (`mode=ro`), Zero TiDB Cloud Runtime Dependencies, In-Memory Thread-Safe Rate Limiting.

---

## 1. Threat Model & Architectural Boundaries

RailSense operates as a public read-only intelligence and prediction platform for Indian Railways historical delay patterns. The application architecture enforces strict security perimeters:

```
[ Client Browser / Mobile ]
           │
           ▼
[ Reverse Proxy / CDN (Vercel / Cloudflare / Render) ]
           │  (X-Forwarded-For, X-Forwarded-Proto, HTTPS termination)
           ▼
[ Flask WSGI / Waitress (ProxyFix x_for=TRUSTED_PROXY_COUNT) ]
    ├── Rate Limiter (Thread-safe sliding-window: 120 req/min API, 30 req/min NLP)
    ├── Security Middlewares (nosniff, DENY, CSP, Referrer-Policy, Permissions-Policy)
    ├── Content-Type Enforcement (415 Unsupported Media Type for non-JSON POST)
    └── Request Size Limit (413 Payload Too Large for > 1MB)
           │
           ▼
[ Read-Only Data Engine ]
    ├── SQLite serving store opened strictly with file:...mode=ro URI mode
    ├── Precomputed immutable JSON analytics
    ├── Local LightGBM Booster (file read-only, in-memory inference)
    └── Local TF-IDF + Logistic Regression NLP (zero external network calls, zero LLMs)
```

### Threat Assessment:
| Threat Category | Potential Attack Vector | RailSense Mitigation & Architecture Defense |
|---|---|---|
| **Credential Exfiltration** | Database password theft, API key exposure | **Complete absence of runtime credentials.** TiDB Cloud was removed as a runtime dependency in Phase 8.5. All runtime serving data is local and public. Git history scanned across all 12 commits with zero committed secrets. |
| **SQL Injection** | Malicious SQL syntax in query params | **Dual Defense:** All queries use parameterized queries (`?`). The SQLite database connection is explicitly established with URI mode `?mode=ro`, prohibiting any write operations at the SQLite engine level. |
| **Remote Code Execution (RCE)** | Deserialization attacks, pickle exploitation | LightGBM model loads from native text format. NLP pipeline loads from validated local artifacts without arbitrary code execution. |
| **Prompt Injection & LLM Jailbreak** | Manipulative input trying to extract system prompt | **Zero LLM Guarantee:** NLP classification is powered by deterministic Logistic Regression. Prompt injection strings (`Ignore instructions`, `<script>`, SQL injection) are categorized into `out_of_scope` (100% rejection rate). |
| **Denial of Service (DoS)** | Request floods, resource exhaustion | Sliding-window thread-safe rate limiter (120 req/min global, 30 req/min NLP). Maximum request payload capped at 1MB (`MAX_CONTENT_LENGTH = 1MB`, HTTP 413). |
| **Client IP Spoofing** | Forged `X-Forwarded-For` headers | Controlled via `TRUSTED_PROXY_COUNT` and `werkzeug.middleware.proxy_fix.ProxyFix`. Untrusted proxy headers are ignored by default (`TRUSTED_PROXY_COUNT=0`). |
| **Clickjacking & MIME Confusion** | Embedding in malicious iframes, MIME-sniffing | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. |
| **Cross-Site Scripting (XSS)** | Malicious HTML/JS injection | React JSX auto-escaping, Content Security Policy (`default-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:;`). |

---

## 2. Git History & Credential Audit

- **Total Commits Audited:** 12 commits (`git log -p`).
- **Secrets / Private Keys Found:** **0** (Zero).
- **Environment Isolation:** Secrets exist exclusively in local `backend/.env` (git-ignored via `.gitignore`).
- **Runtime Dependency Check:** The web application requires zero `TIDB_*` environment variables to start and run.

---

## 3. Dependency Vulnerability Audits

### Backend Audit (`pip-audit`):
```
pip-audit -r backend/requirements.txt
Result: No known vulnerabilities found (0 vulnerabilities across 25 packages).
```

### Frontend Audit (`npm audit`):
- Dev-only testing dependencies (`vitest`, `playwright`, `tinypool`) contain upstream advisory warnings for development mock/server environments.
- Production bundle consists strictly of pre-compiled static assets with no runtime node server.

---

## 4. HTTP Headers & Transport Hardening

Every HTTP response emitted by the Flask application includes the following hardening headers:

| Header | Production Setting | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents browser MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents iframe embedding & clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects referrer leakage on outbound links |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | Disables invasive browser APIs |
| `Content-Security-Policy` | `default-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:;` | Restricts script and asset execution origins |
| `Cache-Control` | `no-store, no-cache, must-revalidate` (POST) / `public, max-age=3600` (GET) | Prevents caching of predictions; enables CDN caching for static analytics |

---

## 5. Security Regression Test Suite

All security hardening controls are automated and verified via `backend/tests/test_security_fuzz.py` (21 tests passing):
- Oversized payload rejection (HTTP 413)
- Non-JSON media type rejection (HTTP 415)
- Malformed JSON recovery (HTTP 400)
- SQL injection fuzzer (search, filters, and kinds)
- Path traversal prevention (`..%2f`)
- Spoofed vs trusted reverse proxy resolution
- Environment validation (`RAILSENSE_ENV` validation on startup)
