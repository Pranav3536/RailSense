# Phase 6.1 — UI Scale-Up & Sizing Audit

**Date:** 2026-10-30  
**Repository:** `c:\RailSense\`  
**Milestone:** Phase 6.1 (Visual Scale-Up)  
**Effective Base Font Size (Before):** 16px (Browser default `100%`)  
**Target Base Font Size (After):** 18px (`html { font-size: 112.5%; }`)

---

## 1. Root & Base Font Size Limits
- `frontend/src/index.css`: No root `font-size` specified. Inherits standard browser `16px`.
- Result: Every `rem` unit evaluates against `16px` base (`text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px).
- **Target:** Set `html { font-size: 112.5%; }` (18px) as the central UI scale knob in `src/index.css`, scaling all rem-based typography and spacing upwards by 12.5%.

---

## 2. Arbitrary Pixel Text Sizes & Micro-Text (< 14px)
The following arbitrary pixel text classes and `text-xs` usages were identified across meaningful interface content:

| File | Line | Class / Usage | Content / Purpose | Remediation |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/layout/AppShell.jsx` | 60 | `text-[9px]` | Mobile brand version pill | Upgrade to `text-xs font-semibold` (13.5px) |
| `src/components/layout/AppShell.jsx` | 103 | `text-xs` | Global footer copyright & delay rule | Upgrade to `text-sm` (15.75px) |
| `src/components/layout/PageHeader.jsx` | 23 | `text-xs sm:text-sm` | View header subtitle | Upgrade to `text-base` (18px) |
| `src/components/layout/Sidebar.jsx` | 92 | `text-xs` | Database readiness status container | Upgrade to `text-sm` (15.75px) |
| `src/components/layout/Sidebar.jsx` | 114 | `text-[11px]` | Database status ping/description | Upgrade to `text-xs font-mono` (13.5px) |
| `src/components/layout/Sidebar.jsx` | 141 | `text-[10px]` | Sidebar brand version pill | Upgrade to `text-xs font-semibold` (13.5px) |
| `src/components/layout/Sidebar.jsx` | 148 | `text-[11px]` | Dataset badge | Upgrade to `text-xs font-medium` (13.5px) |
| `src/components/layout/Sidebar.jsx` | 165 | `text-xs` | Navigation link label | Upgrade to `text-base font-medium` (18px) |
| `src/components/layout/Sidebar.jsx` | 188, 192 | `text-xs` | Creator initials badge & name | Upgrade to `text-sm font-semibold` |
| `src/components/layout/Sidebar.jsx` | 195 | `text-[10px]` | Creator role subtitle | Upgrade to `text-xs text-slate-400` |
| `src/components/ui/Badge.jsx` | 33, 34 | `text-xs` | Badge sizing presets `sm` and `md` | Upgrade `sm` to `text-xs`, `md`/`lg` to `text-sm` |
| `src/components/ui/Card.jsx` | 47 | `text-xs` | CardDescription | Upgrade to `text-sm text-slate-500` |
| `src/components/ui/DefinitionNote.jsx` | 59 | `text-xs` | Definition disclosure popover text | Upgrade to `text-sm leading-relaxed` |
| `src/components/ui/EmptyState.jsx` | 18, 35 | `text-xs` | Empty state title & description | Upgrade to `text-base` / `text-sm` |
| `src/components/ui/ErrorState.jsx` | 19, 28, 41, 48 | `text-xs` | Error title, message, ref badge, button | Upgrade to `text-base` / `text-sm` |
| `src/components/ui/SectionHeader.jsx` | 23 | `text-xs` | Section subtitle | Upgrade to `text-sm text-slate-500` |
| `src/components/ui/StatCard.jsx` | 26 | `text-xs font-semibold` | Stat metric label | Upgrade to `text-sm font-semibold tracking-wide` |
| `src/components/ui/StatCard.jsx` | 42 | `text-xs` | Inline error message | Upgrade to `text-sm` |
| `src/components/ui/StatCard.jsx` | 54, 61 | `text-xs` | Stat unit & delta slot | Upgrade to `text-sm` |
| `src/pages/*.jsx` (All 6 tabs) | 50, 64 | `text-xs uppercase` | Section header labels in placeholders | Upgrade to `text-sm uppercase font-bold` |
| `src/pages/*.jsx` (All 6 tabs) | 55, 70 | `text-xs` | Bullet list items & endpoint cards | Upgrade to `text-sm` |
| `src/pages/*.jsx` (All 6 tabs) | 75 | `text-[11px]` | Endpoint description copy | Upgrade to `text-xs text-slate-500` |
| `src/pages/*.jsx` (All 6 tabs) | 81 | `text-xs` | Integrity Note card | Upgrade to `text-sm` |

---

## 3. Fixed Pixel Widths, Heights & Touch Targets
- **Sidebar Width:** Fixed at `w-64` (256px) in `AppShell.jsx` (lines 48, 86, 93) and `Sidebar.jsx` (line 128).
  - *Remediation:* Widen to `w-72` (288px) on desktop (`lg:w-72`, `lg:pl-72`) and `xl:w-80` (320px, `xl:pl-80`).
- **Touch Targets / Button Sizes:**
  - Sidebar refresh button (`Sidebar.jsx:110`): `p-1` with `size={12}` icon. Hit area is only ~24×24px.
  - Sidebar GitHub/DB links (`Sidebar.jsx:209, 219`): `p-1` with `size={14}` icon. Hit area is only ~28×28px.
  - DefinitionNote trigger (`DefinitionNote.jsx:52`): `p-0.5` with `size={14}` icon.
  - *Remediation:* Guarantee minimum 44×44px interactive hit area for all buttons (`min-w-[44px] min-h-[44px]` or generous padding/flex wrapper).
- **Navigation Item Height:**
  - Currently `py-2.5` (`Sidebar.jsx:165`), resulting in ~38px height.
  - *Remediation:* Enforce `min-h-[48px] py-3 px-4` with 22–24px icons (`size={22}`) and `text-base` font size.

---

## 4. Recharts & Chart Dimension Constraints
- **Chart Height:** `ChartCard.jsx:19` defaulted to `height = 'h-64'` (256px).
  - *Remediation:* Elevate default desktop chart container height to `h-80` (320px) or `h-96` (384px).
- **Missing Shared Chart Theme:** Recharts props (`fontSize`, `stroke`, `margin`) do not scale automatically with rem.
  - *Remediation:* Create `src/components/charts/chartTheme.js` exporting centralized constants:
    - `tickFontSize`: 14px
    - `labelFontSize`: 14px
    - `legendFontSize`: 14px
    - `tooltipFontSize`: 14px
    - Standard margins and palette stroke tokens.

---

## 5. Watermarks & Contrast Proportions
- `src/components/watermarks/RailwayWatermarks.jsx`:
  - `LocomotiveWatermark`: 420×260 viewBox, opacity 0.05.
  - `TrackWatermark`: 340×220 viewBox, opacity 0.04.
  - `SignalGantryWatermark`: 160×280 viewBox, opacity 0.04.
  - `GaugeLinesWatermark`: width 24, opacity 0.06.
- Retain exact SVG vector paths and low opacity (4–6%) so contrast with scaled-up text remains WCAG AA compliant.

---

## 6. Skeletons & Layout Stability
- `Skeleton.jsx` and `StatCard.jsx:38`:
  - StatCard skeleton is `h-8 w-28` for value.
  - *Remediation:* Scale skeleton height to `h-10 w-36` to match new `text-4xl` stat value and prevent layout shifts.
