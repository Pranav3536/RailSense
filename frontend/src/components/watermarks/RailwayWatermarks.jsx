/**
 * RailSense — Subtle Railway SVG Watermarks (src/components/watermarks/RailwayWatermarks.jsx)
 * 
 * Rules:
 * - 4-6% opacity so they never interfere with text contrast or readability
 * - pointer-events-none and aria-hidden="true"
 * - Scaled / hidden on mobile devices and completely hidden in print
 * - Inline vector paths (zero external network requests)
 */

export function LocomotiveWatermark() {
  return (
    <div
      aria-hidden="true"
      className="watermark-layer pointer-events-none absolute bottom-0 right-0 z-0 hidden lg:block select-none overflow-hidden opacity-[0.05]"
    >
      <svg
        width="420"
        height="260"
        viewBox="0 0 420 260"
        fill="none"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Aerodynamic Locomotive Body */}
        <path d="M 40 220 L 380 220" strokeWidth="4" />
        <path d="M 60 220 L 70 140 L 120 110 L 260 110 L 330 140 L 370 190 L 370 220 Z" />
        {/* Cab Windshield */}
        <polygon points="125,115 170,115 165,145 115,145" fill="currentColor" fillOpacity="0.3" />
        <polygon points="180,115 225,115 225,145 175,145" fill="currentColor" fillOpacity="0.3" />
        <polygon points="235,115 255,115 315,145 235,145" fill="currentColor" fillOpacity="0.3" />
        {/* Roof Pantograph */}
        <path d="M 170 110 L 190 70 L 230 70 L 250 110" />
        <path d="M 195 70 L 225 70" strokeWidth="3" />
        <line x1="180" y1="58" x2="240" y2="58" strokeWidth="3" />
        <line x1="210" y1="58" x2="210" y2="70" />
        {/* Bogie Wheels */}
        <circle cx="100" cy="225" r="16" strokeWidth="3" />
        <circle cx="100" cy="225" r="5" />
        <circle cx="145" cy="225" r="16" strokeWidth="3" />
        <circle cx="145" cy="225" r="5" />
        <circle cx="280" cy="225" r="16" strokeWidth="3" />
        <circle cx="280" cy="225" r="5" />
        <circle cx="325" cy="225" r="16" strokeWidth="3" />
        <circle cx="325" cy="225" r="5" />
        {/* Cowcatcher / Pilot */}
        <polygon points="365,220 395,220 375,195" />
        {/* Headlight Beam Lines */}
        <line x1="375" y1="180" x2="415" y2="175" strokeDasharray="4 4" />
        <line x1="375" y1="185" x2="415" y2="190" strokeDasharray="4 4" />
      </svg>
    </div>
  );
}

export function TrackWatermark() {
  return (
    <div
      aria-hidden="true"
      className="watermark-layer pointer-events-none absolute top-0 right-0 z-0 hidden md:block select-none overflow-hidden opacity-[0.04]"
    >
      <svg
        width="340"
        height="220"
        viewBox="0 0 340 220"
        fill="none"
        stroke="#1E293B"
        strokeWidth="2"
      >
        {/* Parallel Diagonal Rails */}
        <line x1="60" y1="-20" x2="360" y2="180" strokeWidth="3.5" />
        <line x1="120" y1="-20" x2="420" y2="180" strokeWidth="3.5" />
        {/* Sleepers / Ties */}
        {Array.from({ length: 12 }).map((_, i) => {
          const x1 = 50 + i * 25;
          const y1 = -10 + i * 16.5;
          const x2 = x1 + 80;
          const y2 = y1 - 20;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="3" strokeLinecap="square" />;
        })}
      </svg>
    </div>
  );
}

export function SignalGantryWatermark() {
  return (
    <div
      aria-hidden="true"
      className="watermark-layer pointer-events-none absolute bottom-4 left-6 z-0 hidden xl:block select-none overflow-hidden opacity-[0.04]"
    >
      <svg
        width="160"
        height="280"
        viewBox="0 0 160 280"
        fill="none"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {/* Vertical Lattice Mast */}
        <line x1="30" y1="20" x2="30" y2="270" strokeWidth="3" />
        <line x1="50" y1="20" x2="50" y2="270" strokeWidth="3" />
        {/* Lattice Crosses */}
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1="30" y1={40 + i * 25} x2="50" y2={65 + i * 25} />
            <line x1="50" y1={40 + i * 25} x2="30" y2={65 + i * 25} />
          </g>
        ))}
        {/* Signal Arm and Hood */}
        <rect x="50" y="30" width="45" height="15" rx="3" strokeWidth="2" />
        <rect x="75" y="45" width="28" height="60" rx="6" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
        <circle cx="89" cy="60" r="6" />
        <circle cx="89" cy="76" r="6" />
        <circle cx="89" cy="92" r="6" />
      </svg>
    </div>
  );
}

export function GaugeLinesWatermark() {
  return (
    <div
      aria-hidden="true"
      className="watermark-layer pointer-events-none absolute inset-y-0 right-2 z-0 hidden lg:block select-none opacity-[0.06]"
    >
      <svg width="24" height="100%" fill="none" stroke="#FFFFFF" strokeWidth="1.5">
        <line x1="6" y1="0" x2="6" y2="100%" strokeDasharray="8 12" />
        <line x1="18" y1="0" x2="18" y2="100%" strokeDasharray="8 12" />
      </svg>
    </div>
  );
}

export function RailwayWatermarks() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      <LocomotiveWatermark />
      <TrackWatermark />
      <SignalGantryWatermark />
    </div>
  );
}
export default RailwayWatermarks;
