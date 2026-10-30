# RailSense — UI Design System & Component Specifications

**Version:** 2.0.4 (Phase 6.1 UI Scale-Up)  
**Framework:** React 18 (plain JavaScript / JSX) + Vite + Tailwind CSS + Lucide React + Recharts  
**Audience:** Data Science / ML portfolio presentation layer  

---

## 1. System Vision & Global UI Scale

RailSense is an Indian Railways delay intelligence and prediction platform. The frontend serves strictly as the presentation layer for genuine data engineering, machine learning, and local NLP models.

### Global UI Scale Knob (Phase 6.1)
To guarantee optimal readability across modern displays, the root font size is defined centrally in `src/index.css`:
```css
html {
  font-size: 112.5%; /* 18px base root (up from 16px default) */
}

@media (max-width: 399px) {
  html {
    font-size: 106.25%; /* 17px base root on small mobile to prevent overflow */
  }
}
```
Because the entire application relies on Tailwind's `rem` typography and spacing units, this single knob scales all text, padding, card geometry, and layout dimensions proportionally by **+12.5%**.

### Core UI Principles
1. **Truthfulness Over Mockery:** Never display hardcoded mock statistics, unverified numbers, or fake benchmark rows. Missing or unmeasured metrics render explicitly as `"Not available"`.
2. **Accessible & Legible by Default:** Minimum 44×44px touch targets on all interactive controls; minimum 15.75px text for all body and informational copy.
3. **Subtle Domain Identity:** High-contrast, clean professional layout accented by subtle railway-themed vector watermarks (4–6% opacity) that never compromise data readability.
4. **Resilient Connectivity:** Dedicated status card polling the live backend `/api/health/ready` endpoint, truthfully distinguishing between database downtime, server offline states, and active connectivity.

---

## 2. Color Palette & Theme Tokens

The RailSense palette uses a clean slate canvas paired with a deep navy control sidebar and semantic indicators.

| Token | Hex Code | Tailwind Class | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Sidebar Navy** | `#0B132B` | `bg-navy-900` | Primary navigation sidebar, branding panel |
| **Sidebar Card** | `#14213D` | `bg-navy-800` | Truthful database status card surface |
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

## 3. Typography Scale & Hierarchy

### Before vs. After Sizing Comparison

| Semantic Token | Tailwind Class | Old Scale (16px Base) | New Scale (18px Base) | Role in RailSense |
| :--- | :--- | :--- | :--- | :--- |
| **KPI Value** | `text-4xl` | 36.0 px (2.25rem) | **40.5 px** | Primary StatCard values (`tabular-nums`) |
| **Page View Title**| `text-3xl` | 30.0 px (1.875rem) | **33.75 px** | Top `PageHeader` view titles |
| **Sub-Header** | `text-2xl` | 24.0 px (1.5rem) | **27.0 px** | Major section breakouts, dialog titles |
| **Section Title** | `text-xl` | 20.0 px (1.25rem) | **22.5 px** | `SectionHeader` titles |
| **Card Title** | `text-lg` | 18.0 px (1.125rem) | **20.25 px** | `CardTitle`, analytical module headers |
| **Standard Body** | `text-base` | 16.0 px (1.0rem) | **18.0 px** | Primary prose, navigation items |
| **Secondary / Caption**| `text-sm` | 14.0 px (0.875rem) | **15.75 px** | Stat labels, card descriptions (**Min Text Threshold**) |
| **Micro-Label** | `text-xs` | 12.0 px (0.75rem) | **13.5 px** | Decorative/monospace tags only (no general copy) |

> [!IMPORTANT]
> **Minimum Text Size Rule:** No meaningful content may render below `text-sm` (15.75px effective size). `text-xs` (13.5px) is reserved exclusively for decorative badges, HTTP method chips (`GET`, `POST`), or mono reference IDs.

---

## 4. Recharts Chart Theme (`src/components/charts/chartTheme.js`)

Because Recharts renders SVG vector graphics with explicit numeric pixel values rather than CSS rems, all charts across RailSense import standard sizing constants from `CHART_THEME`:

- **Axis Ticks:** `fontSize: 14` (`fill: #475569`)
- **Axis Labels:** `fontSize: 14` (`fill: #0F172A`)
- **Legend Items:** `fontSize: 14`
- **Tooltip Text:** `fontSize: '14px'`, dark navy container (`#0B132B`) with rounded-lg border
- **Standard Chart Height:** 360 px (`CHART_THEME.heights.standard`), minimum container height 320 px.

---

## 5. Touch Target & Accessibility Standards

- **Interactive Target Size:** Minimum **44×44px** hit area on all buttons, links, icon toggles, and disclosure popovers (WCAG 2.5.5).
- **DefinitionNote Disclosure:** Trigger button is `min-w-[44px] min-h-[44px]` with `size={20}` icon. Popover container is `w-80 sm:w-96` with `text-sm leading-relaxed`.
- **Keyboard Navigation:** Dedicated skip link (`#main-content`) with high-contrast active ring; escape-key dismiss on all tooltips and drawers.

---

## 6. Layout Architecture & App Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skip to content (keyboard focus only)                                      │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │ Mobile Header (visible < lg only, min-h-[56px])          │
│                  ├──────────────────────────────────────────────────────────┤
│ SIDEBAR          │ MAIN CANVAS (lg:pl-72 xl:pl-80, bg-slate-50, relative)   │
│ w-72 (lg)        │                                                          │
│ w-80 (xl)        │  [Subtle Railway SVG Watermarks: 4-6% opacity]           │
│ Navy #0B132B     │                                                          │
│                  │  <PageHeader /> (text-3xl title, text-base subtitle)     │
│ • RailSense Brand│                                                          │
│   v2.0.4 Pill    │  <Outlet />                                              │
│ • Dataset Badge  │   (Overview | Explorer | Predict | Model Lab | Patterns) │
│ • 6 Fixed Tabs   │                                                          │
│   (48px height)  │  <Footer /> (text-sm, delay definition)                  │
│ • Truthful DB    │                                                          │
│   Status Card    │                                                          │
│ • Creator Card   │                                                          │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### Breakpoints & Sizing
- `sm: 640px` (2-column stat grids)
- `md: 768px` (expanded chart cards)
- `lg: 1024px` (fixed desktop sidebar at `w-72` / 288px; main canvas `lg:pl-72`)
- `xl: 1280px` (expanded desktop sidebar at `w-80` / 320px; main canvas `xl:pl-80`, 4-column KPI cards)
- Verified vertical fit at both 1280×720 and 1366×768 with zero clipping on pinned sidebar footer.
