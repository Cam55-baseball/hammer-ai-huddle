/**
 * IqField — realistic top-down baseball/softball field.
 *
 * Replaces the "sandlot" look with:
 *  - Sport-scaled diamond (60'6" mound / 43' circle)
 *  - Back-of-infield dirt arc + grass cutout
 *  - Base paths, foul lines to fence, warning track
 *  - Batter's boxes, catcher's box, on-deck circles, coach's boxes
 *
 * Renders on a 100×100 viewBox so overlays (defender pucks) share coords.
 */

import { fieldPoints, type FieldSport } from "@/lib/iq/fieldModel";

interface Props {
  sport: FieldSport;
  className?: string;
  showGrid?: boolean;
}

export function IqField({ sport, className, showGrid }: Props) {
  const f = fieldPoints(sport);
  const { home, first, second, third, mound, gpf, s } = f;

  // Fence: arc from foul-line-left to foul-line-right at outfieldDist
  const fenceR = s.fenceRef * gpf;
  // Foul lines at 45° from home
  const foulLen = fenceR * 1.02;
  const foulL = { x: home.x - foulLen * Math.SQRT1_2, y: home.y - foulLen * Math.SQRT1_2 };
  const foulR = { x: home.x + foulLen * Math.SQRT1_2, y: home.y - foulLen * Math.SQRT1_2 };
  const wt = Math.max(1.6, fenceR * 0.045); // warning track width

  // Infield dirt arc radius from mound centre (real ≈ 95' baseball / 65' softball)
  const dirtR = (sport === "baseball" ? 95 : 65) * gpf;

  return (
    <svg
      viewBox="0 0 100 100"
      className={"absolute inset-0 h-full w-full " + (className ?? "")}
      aria-hidden
    >
      <defs>
        <radialGradient id="iq-grass" cx="50%" cy="100%" r="90%">
          <stop offset="0%" stopColor="hsl(var(--iq-field))" stopOpacity="1" />
          <stop offset="80%" stopColor="hsl(var(--iq-field))" stopOpacity="0.75" />
        </radialGradient>
        <linearGradient id="iq-dirt" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(28 40% 42%)" />
          <stop offset="100%" stopColor="hsl(24 45% 34%)" />
        </linearGradient>
      </defs>

      {/* Full grass field */}
      <rect x="0" y="0" width="100" height="100" fill="url(#iq-grass)" />

      {/* Fair-territory outline: foul lines to fence + fence arc */}
      <path
        d={`M ${home.x} ${home.y}
            L ${foulL.x} ${foulL.y}
            A ${fenceR} ${fenceR} 0 0 1 ${foulR.x} ${foulR.y}
            Z`}
        fill="hsl(var(--iq-field) / 0.85)"
        stroke="hsl(var(--iq-chalk) / 0.4)"
        strokeWidth="0.35"
      />

      {/* Warning track (concentric ring inside fence) */}
      <path
        d={`M ${home.x + (fenceR - wt) * Math.SQRT1_2} ${home.y - (fenceR - wt) * Math.SQRT1_2}
            A ${fenceR - wt} ${fenceR - wt} 0 0 0 ${home.x - (fenceR - wt) * Math.SQRT1_2} ${home.y - (fenceR - wt) * Math.SQRT1_2}
            L ${foulL.x} ${foulL.y}
            A ${fenceR} ${fenceR} 0 0 1 ${foulR.x} ${foulR.y}
            Z`}
        fill="hsl(28 30% 55% / 0.35)"
      />

      {/* Infield dirt disk centered on mound (baseball) / circle (softball) */}
      <circle cx={mound.x} cy={mound.y} r={dirtR} fill="url(#iq-dirt)" opacity="0.9" />

      {/* Grass cutout inside the diamond */}
      <polygon
        points={`${second.x},${second.y} ${first.x},${first.y} ${home.x},${home.y} ${third.x},${third.y}`}
        fill="hsl(var(--iq-field) / 0.95)"
        stroke="hsl(var(--iq-chalk) / 0.55)"
        strokeWidth="0.35"
      />

      {/* Base paths (chalked baselines) */}
      <polyline
        points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y} ${home.x},${home.y}`}
        fill="none"
        stroke="hsl(var(--iq-chalk))"
        strokeWidth="0.45"
      />

      {/* Foul lines (chalked) */}
      <line x1={home.x} y1={home.y} x2={foulL.x} y2={foulL.y}
            stroke="hsl(var(--iq-chalk))" strokeWidth="0.35" />
      <line x1={home.x} y1={home.y} x2={foulR.x} y2={foulR.y}
            stroke="hsl(var(--iq-chalk))" strokeWidth="0.35" />

      {/* Bases */}
      {[first, second, third].map((b, i) => (
        <rect key={i}
          x={b.x - 1.4} y={b.y - 1.4} width="2.8" height="2.8"
          fill="hsl(var(--iq-chalk))"
          transform={`rotate(45 ${b.x} ${b.y})`} />
      ))}

      {/* Home plate (pentagon) */}
      <polygon
        points={`${home.x - 1.2},${home.y - 0.4} ${home.x + 1.2},${home.y - 0.4} ${home.x + 1.2},${home.y + 0.5} ${home.x},${home.y + 1.6} ${home.x - 1.2},${home.y + 0.5}`}
        fill="hsl(var(--iq-chalk))"
      />

      {/* Batter's boxes */}
      <rect x={home.x - 3.8} y={home.y - 2.4} width="1.8" height="4.8" fill="none"
            stroke="hsl(var(--iq-chalk) / 0.85)" strokeWidth="0.25" />
      <rect x={home.x + 2.0} y={home.y - 2.4} width="1.8" height="4.8" fill="none"
            stroke="hsl(var(--iq-chalk) / 0.85)" strokeWidth="0.25" />
      {/* Catcher's box */}
      <path d={`M ${home.x - 2.0} ${home.y + 2.6} L ${home.x - 2.0} ${home.y + 5.0} L ${home.x + 2.0} ${home.y + 5.0} L ${home.x + 2.0} ${home.y + 2.6}`}
            fill="none" stroke="hsl(var(--iq-chalk) / 0.8)" strokeWidth="0.25" />

      {/* Coach's boxes */}
      <rect x={first.x + 3}  y={first.y - 5} width="4" height="3" fill="none"
            stroke="hsl(var(--iq-chalk) / 0.6)" strokeDasharray="0.4 0.6" strokeWidth="0.2" />
      <rect x={third.x - 7}  y={third.y - 5} width="4" height="3" fill="none"
            stroke="hsl(var(--iq-chalk) / 0.6)" strokeDasharray="0.4 0.6" strokeWidth="0.2" />

      {/* On-deck circles */}
      <circle cx={home.x - 12} cy={home.y - 1} r="2" fill="none"
              stroke="hsl(var(--iq-chalk) / 0.5)" strokeWidth="0.25" />
      <circle cx={home.x + 12} cy={home.y - 1} r="2" fill="none"
              stroke="hsl(var(--iq-chalk) / 0.5)" strokeWidth="0.25" />

      {/* Mound (baseball) or pitcher's circle (softball) */}
      {sport === "baseball" ? (
        <>
          <circle cx={mound.x} cy={mound.y} r="3.6"
                  fill="hsl(24 45% 34%)" stroke="hsl(var(--iq-chalk) / 0.4)" strokeWidth="0.2" />
          <rect x={mound.x - 1.1} y={mound.y - 0.35} width="2.2" height="0.7"
                fill="hsl(var(--iq-chalk))" />
        </>
      ) : (
        <>
          <circle cx={mound.x} cy={mound.y} r="4.5"
                  fill="none" stroke="hsl(var(--iq-chalk) / 0.7)" strokeWidth="0.3" />
          <rect x={mound.x - 1.1} y={mound.y - 0.35} width="2.2" height="0.7"
                fill="hsl(var(--iq-chalk))" />
        </>
      )}

      {/* Optional step grid overlay (25% opacity) */}
      {showGrid && (
        <g opacity="0.18" stroke="hsl(var(--iq-chalk))" strokeWidth="0.1">
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} />
          ))}
        </g>
      )}
    </svg>
  );
}
