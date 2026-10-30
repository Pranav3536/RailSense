/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FIXED DESIGN SYSTEM TOKENS
        navy: {
          DEFAULT: '#0B132B',
          900: '#0B132B',
          800: '#14213D',
          hover: 'rgba(255, 255, 255, 0.1)',
        },
        canvas: '#F8FAFC',
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          600: '#EF4444',
          700: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#F59E0B',
          700: '#D97706',
        },
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#10B981',
          700: '#059669',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      // TYPOGRAPHY SCALE (Phase 6.1 — at 18px / 112.5% root):
      // text-xs:  0.75rem  = 13.5px (micro-labels / badges only)
      // text-sm:  0.875rem = 15.75px (secondary, stat labels, card descriptions — min text threshold)
      // text-base: 1.0rem   = 18.0px (standard body copy, nav links)
      // text-lg:   1.125rem = 20.25px (card titles, section subheads)
      // text-xl:   1.25rem  = 22.5px (section titles)
      // text-2xl:  1.5rem   = 27.0px (sub-headers)
      // text-3xl:  1.875rem = 33.75px (page view headers)
      // text-4xl:  2.25rem  = 40.5px (stat card primary KPI values)
    },
  },
  plugins: [],
};
