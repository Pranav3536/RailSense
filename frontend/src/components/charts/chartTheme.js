/**
 * RailSense — Shared Recharts Theme & Sizing Constants (Phase 6.1)
 * 
 * Recharts props are numeric pixel values and do NOT scale automatically with CSS rem.
 * This centralized theme ensures all Recharts components across RailSense
 * inherit readable typography, WCAG-compliant stroke colors, and standardized heights.
 */

export const CHART_THEME = {
  // Typography (explicit px sizes)
  fontSize: {
    tick: 14,
    label: 14,
    legend: 14,
    tooltip: 14,
    title: 18,
  },

  // Color Palette Tokens
  colors: {
    primary: '#2563EB',      // Primary Blue (accent)
    delayed: '#EF4444',      // Danger / Delayed > 15 min
    warning: '#F59E0B',      // Moderate risk / 0-15 min
    onTime: '#10B981',       // Success / On-Time
    grid: '#E2E8F0',         // Slate-200 border
    axis: '#64748B',         // Slate-500 text/ticks
    textMuted: '#64748B',    // Slate-500
    textPrimary: '#0F172A',  // Slate-900
    tooltipBg: '#0B132B',    // Navy-900 background for tooltips
    tooltipBorder: '#334155',// Slate-700
  },

  // Standard Margins
  margin: {
    top: 16,
    right: 24,
    bottom: 24,
    left: 16,
  },

  // Sizing Defaults (in px)
  heights: {
    compact: 280,
    standard: 360,
    large: 440,
  },

  // Reusable subcomponent prop presets
  axisProps: {
    stroke: '#64748B',
    tick: { fill: '#475569', fontSize: 14 },
    tickLine: { stroke: '#CBD5E1' },
  },

  gridProps: {
    stroke: '#E2E8F0',
    strokeDasharray: '3 3',
    vertical: false,
  },

  tooltipProps: {
    contentStyle: {
      backgroundColor: '#0B132B',
      borderColor: '#334155',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '14px',
      padding: '8px 12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    itemStyle: {
      color: '#F8FAFC',
      fontSize: '14px',
    },
    labelStyle: {
      color: '#94A3B8',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '4px',
    },
  },
};
