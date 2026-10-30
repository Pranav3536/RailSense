# RailSense — UI Design System & Component Specifications

**Version:** 2.0.4  
**Framework:** React 18 (plain JavaScript / JSX) + Vite + Tailwind CSS + Lucide React + Recharts  
**Audience:** Data Science / ML portfolio presentation layer  

---

## 1. System Vision & Principles

RailSense is an Indian Railways delay intelligence and prediction platform. The frontend serves strictly as the presentation layer for genuine data engineering, machine learning, and local NLP models.

### Core UI Principles
1. **Truthfulness Over Mockery:** Never display hardcoded mock statistics, unverified numbers, or fake benchmark rows. Missing or unmeasured metrics render explicitly as `"Not available"`.
2. **Accessible by Default:** Keyboard-navigable skip links, semantic landmarks (`<aside>`, `<main>`, `<header>`), `aria-live` status regions, and screen-reader fallbacks for analytical charts.
3. **Subtle Domain Identity:** High-contrast, clean professional layout accented by subtle railway-themed vector watermarks (4–6% opacity) that never compromise data readability.
4. **Resilient Connectivity:** Dedicated status card polling the live backend `/api/health/ready` endpoint, truthfully distinguishing between database downtime, server offline states, and active connectivity.

---

## 2. Color Palette & Theme Tokens

The RailSense palette uses a clean slate canvas paired with a deep navy control sidebar and semantic indicators.

| Token | Hex Code | Tailwind Class | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Sidebar Navy** | `#0B132B` | `bg-navy-900` | Primary navigation sidebar, branding panel |
| **Sidebar Card** | `#1C2541` | `bg-navy-800` | Truthful database status card surface |
| **Main Canvas** | `#F8FAFC` | `bg-slate-50` | Primary app canvas and page backdrop |
| **Surface Card** | `#FFFFFF` | `bg-white` | Analytical cards, charts, and content panels |
| **Border Neutral**| `#E2E8F0` | `border-slate-200` | Card borders, table dividers, panel boundaries |
| **Primary Action**| `#2563EB` | `bg-blue-600` | Active navigation tabs, primary CTA buttons |
| **Delayed / Danger**| `#EF4444` | `bg-red-500` / `text-red-700` | Arrival delay > 15 min, API offline, error alerts |
| **Warning** | `#F59E0B` | `bg-amber-500` / `text-amber-800` | Moderate delay risk, database unavailable |
| **Success / On-Time**| `#10B981` | `bg-emerald-500` / `text-emerald-700` | On-time stops (delay ≤ 15 min), database connected |
| **Text Primary** | `#0F172A` | `text-slate-900` | Page headers, KPI values, high-contrast titles |
| **Text Secondary**| `#475569` | `text-slate-600` | Subtitles, body prose, analytical notes |
| **Text Muted** | `#64748B` | `text-slate-500` | Timestamps, units, metadata labels |

---

## 3. Typography Hierarchy

RailSense uses the system font stack for zero-latency, cross-platform font rendering.

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

- **H1 / View Header:** `text-2xl font-bold tracking-tight text-slate-900`
- **H2 / Section Title:** `text-lg font-bold text-slate-900 tracking-tight`
- **H3 / Card Header:** `text-base font-semibold text-slate-900`
- **KPI Value:** `text-2xl font-bold tracking-tight text-slate-900`
- **Body Text:** `text-xs sm:text-sm text-slate-600 leading-relaxed`
- **Microcopy / Footers:** `text-[11px] text-slate-400`
- **Code / Monospace:** `font-mono text-xs` (API routes, HTTP methods, JSON keys)

---

## 4. Component Catalog

### 4.1 Surface & Structure Components
- **`Card`** (`src/components/ui/Card.jsx`): Base container featuring white background, `border-slate-200`, `shadow-sm`, and `rounded-xl`. Subcomponents include `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.
- **`SectionHeader`** (`src/components/ui/SectionHeader.jsx`): Consistent section heading with title, subtitle, optional badge, and right-aligned action slot.
- **`PageHeader`** (`src/components/layout/PageHeader.jsx`): Top-level banner for all primary tabs with title, description, phase pill, and view actions.

### 4.2 Analytical & Metric Components
- **`StatCard`** (`src/components/ui/StatCard.jsx`): Displays single KPI metrics.
  - Supports `label`, `value`, `unit`, `delta`, and `definition`.
  - Built-in `loading` (renders pulse skeleton), `error` (compact alert), and `empty` (displays `"Not available"` without breaking layout).
- **`DefinitionNote`** (`src/components/ui/DefinitionNote.jsx`): Accessible popover disclosure displaying the exact operational definition of metrics (e.g. standard delay criterion: `arrival_delay > 15 min on label-eligible stops seq > 1`).
- **`Badge`** (`src/components/ui/Badge.jsx`): Categorization pills supporting semantic variants (`primary`, `danger`, `warning`, `success`, `neutral`, `navy`, `outline`) with optional live status dots and pulse animations.
- **`ChartCard`** (`src/components/ui/ChartCard.jsx`): Recharts wrapper providing standard title, definition popover, loading skeletons, error fallback with retry, empty state, and accessible screen-reader descriptions.

### 4.3 State & Feedback Components
- **`Skeleton`** (`src/components/ui/Skeleton.jsx`): Animated pulse placeholder for loading states (`rectangular`, `circular`, `text`, `pill`).
- **`Spinner`** (`src/components/ui/Spinner.jsx`): Accessible spinning `Loader2` indicator with customizable size and label.
- **`ErrorState`** (`src/components/ui/ErrorState.jsx`): Standard error display with HTTP status code, request reference ID, and retry action.
- **`EmptyState`** (`src/components/ui/EmptyState.jsx`): Helpful empty state card when search or filters return zero records.
- **`ErrorBoundary`** (`src/pages/ErrorBoundary.jsx`): Top-level error boundary preventing unhandled JavaScript crashes from blanking the screen.

---

## 5. Layout Architecture & App Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skip to content (keyboard focus only)                                      │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │ Mobile Header (visible < lg only, includes hamburger)    │
│                  ├──────────────────────────────────────────────────────────┤
│ SIDEBAR (w-64)   │ MAIN CANVAS (lg:pl-64, bg-slate-50, relative)            │
│ Navy #0B132B     │                                                          │
│                  │  [Subtle Railway SVG Watermarks: 4-6% opacity]           │
│ • RailSense Brand│                                                          │
│   v2.0.4 Pill    │  <PageHeader />                                          │
│ • Dataset Badge  │                                                          │
│ • 6 Fixed Tabs   │  <Outlet />                                              │
│ • Truthful DB    │   (Overview | Explorer | Predict | Model Lab | Patterns) │
│   Status Card    │                                                          │
│ • Creator Card   │  <Footer />                                              │
│   (PR, GH, TiDB) │                                                          │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### Breakpoints
- `sm: 640px` (2-column stat grids)
- `md: 768px` (expanded chart cards)
- `lg: 1024px` (fixed desktop sidebar; mobile drawer hidden)
- `xl: 1280px` (4-column KPI cards and multi-pane analytical tables)

---

## 6. Truthful Connectivity Architecture

The sidebar database status card queries `GET /api/health/ready` via the `useReadiness` hook and evaluates into 4 unambiguous states:

1. **`checking`:** Displays "Checking...", slate pulse dot, "Verifying backend & database...".
2. **`connected`:** Displays "Database connected", emerald dot, "TiDB Cloud online".
3. **`db_unavailable`:** Displays "Database unavailable", amber dot, reports specific DB error message.
4. **`unreachable`:** Displays "API unreachable", red dot, reports network error or server offline.

*Efficiency rule:* Polling automatically pauses via `visibilitychange` when the browser tab is hidden to conserve free-tier bandwidth.

---

## 7. Subtle Railway SVG Watermarks

Injected into the canvas via `src/components/watermarks/RailwayWatermarks.jsx`:
- **`LocomotiveWatermark`:** Streamlined locomotive outline positioned in the bottom-right corner at `5%` opacity.
- **`TrackWatermark`:** Perspective railway track with sleepers in the top-right corner at `4%` opacity.
- **`SignalGantryWatermark`:** Lattice signal mast in the bottom-left corner at `4%` opacity.
- **`GaugeLinesWatermark`:** Subtle gauge guide lines.

All watermark layers are `pointer-events-none`, `aria-hidden="true"`, and completely hidden during browser printing.
