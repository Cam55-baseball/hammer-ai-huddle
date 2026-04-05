import { useState, useRef, useCallback } from 'react';
import { getFieldGeometry, type Point } from './fieldGeometry';

interface FieldPositionDiagramProps {
  sport: 'baseball' | 'softball';
  position?: string;
  onUpdate: (data: { playerPos: Point; ballPos: Point }) => void;
}

const DOT_RADIUS = 12;

// Colors
const GRASS = '#3d8c2a';
const GRASS_DARK = '#327321';
const GRASS_STRIPE = '#48992f';
const DIRT = '#c4956a';
const DIRT_DARK = '#b07a52';
const CHALK = 'rgba(255,255,255,0.75)';
const FENCE_COLOR = '#1a4a0e';
const WARNING_TRACK = '#a87d55';

export function FieldPositionDiagram({ sport, position, onUpdate }: FieldPositionDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 500;
  const geo = getFieldGeometry(sport, W);

  const initialPlayerPos = position && geo.positionsNormalized[position]
    ? geo.positionsNormalized[position]
    : geo.positionsNormalized['SS'] ?? { x: 0.5, y: 0.55 };

  const [playerPos, setPlayerPos] = useState<Point>(initialPlayerPos);
  const [ballPos, setBallPos] = useState<Point>({ x: 0.55, y: 0.35 });
  const [dragging, setDragging] = useState<'player' | 'ball' | null>(null);

  const toSvgCoords = useCallback((e: React.PointerEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = (which: 'player' | 'ball') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(which);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const pt = toSvgCoords(e);
    if (dragging === 'player') setPlayerPos(pt);
    else setBallPos(pt);
  }, [dragging, toSvgCoords]);

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      setDragging(null);
      onUpdate({ playerPos, ballPos });
    }
  }, [dragging, playerPos, ballPos, onUpdate]);

  const { home, first, second, third, mound, outfieldRadius, foulLeft, foulRight, warningTrackWidth, dirtRadius } = geo;

  // Home plate — MLB spec pentagon
  const hpW = 8.5;
  const homePlatePoints = [
    `${home.x},${home.y - hpW}`,
    `${home.x + hpW},${home.y - hpW * 0.3}`,
    `${home.x + hpW},${home.y + hpW * 0.4}`,
    `${home.x - hpW},${home.y + hpW * 0.4}`,
    `${home.x - hpW},${home.y - hpW * 0.3}`,
  ].join(' ');

  // Warning track radii
  const outerR = outfieldRadius;
  const innerR = outfieldRadius - warningTrackWidth;

  // Mowing stripe arcs
  const stripeCount = 8;
  const stripeGap = (innerR - dirtRadius * 1.3) / stripeCount;

  // Infield dirt — arc-shaped cutout (realistic rounded shape)
  const dirtArcR = dirtRadius * 1.15;
  const basepathExtend = geo.baseDist * 0.18;

  // Compute batter's box positions
  const boxW = 8;
  const boxH = 18;

  const zonePos = position && geo.positions[position];

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${W}`}
        className="w-full touch-none select-none rounded-xl overflow-hidden"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <filter id="dotShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodOpacity="0.45" />
          </filter>
          {/* Radial grass stripe pattern */}
          <clipPath id="fairClip">
            <path d={`M ${home.x} ${home.y} L ${foulLeft.x} ${foulLeft.y} A ${outerR} ${outerR} 0 0 1 ${foulRight.x} ${foulRight.y} Z`} />
          </clipPath>
        </defs>

        {/* === Layer 1: Background (foul territory) === */}
        <rect width={W} height={W} fill={GRASS_DARK} rx={12} />

        {/* === Layer 2: Fair territory wedge === */}
        <path
          d={`M ${home.x} ${home.y} L ${foulLeft.x} ${foulLeft.y} A ${outerR} ${outerR} 0 0 1 ${foulRight.x} ${foulRight.y} Z`}
          fill={GRASS}
        />

        {/* === Layer 2b: Mowing stripes (concentric arcs) === */}
        <g clipPath="url(#fairClip)">
          {Array.from({ length: stripeCount }, (_, i) => {
            if (i % 2 !== 0) return null;
            const r = dirtRadius * 1.4 + i * stripeGap;
            const leftX = home.x - r * Math.SQRT1_2;
            const leftY = home.y - r * Math.SQRT1_2;
            const rightX = home.x + r * Math.SQRT1_2;
            const rightY = home.y - r * Math.SQRT1_2;
            return (
              <path
                key={i}
                d={`M ${leftX} ${leftY} A ${r} ${r} 0 0 1 ${rightX} ${rightY}`}
                fill="none"
                stroke={GRASS_STRIPE}
                strokeWidth={stripeGap}
                opacity={0.35}
              />
            );
          })}
        </g>

        {/* === Layer 3: Warning track (filled arc band) === */}
        <path
          d={`
            M ${home.x - outerR * Math.SQRT1_2} ${home.y - outerR * Math.SQRT1_2}
            A ${outerR} ${outerR} 0 0 1 ${home.x + outerR * Math.SQRT1_2} ${home.y - outerR * Math.SQRT1_2}
            L ${home.x + innerR * Math.SQRT1_2} ${home.y - innerR * Math.SQRT1_2}
            A ${innerR} ${innerR} 0 0 0 ${home.x - innerR * Math.SQRT1_2} ${home.y - innerR * Math.SQRT1_2}
            Z
          `}
          fill={WARNING_TRACK}
          opacity={0.55}
        />

        {/* === Layer 4: Outfield fence === */}
        <path
          d={`M ${home.x - outerR * Math.SQRT1_2} ${home.y - outerR * Math.SQRT1_2} A ${outerR} ${outerR} 0 0 1 ${home.x + outerR * Math.SQRT1_2} ${home.y - outerR * Math.SQRT1_2}`}
          fill="none"
          stroke={FENCE_COLOR}
          strokeWidth={4}
        />

        {/* === Layer 5: Foul lines (chalk) === */}
        <line x1={home.x} y1={home.y} x2={foulLeft.x} y2={foulLeft.y} stroke={CHALK} strokeWidth={2} />
        <line x1={home.x} y1={home.y} x2={foulRight.x} y2={foulRight.y} stroke={CHALK} strokeWidth={2} />

        {/* === Layer 6: Infield dirt — arc + basepath extensions === */}
        {/* Main dirt circle centered between home and second */}
        <circle
          cx={home.x}
          cy={home.y - geo.baseDist * 0.7}
          r={dirtArcR}
          fill={DIRT}
        />
        {/* Home plate area dirt (semi-circle) */}
        <circle cx={home.x} cy={home.y} r={geo.baseDist * 0.22} fill={DIRT} />
        {/* Basepath dirt corridors */}
        <line x1={home.x} y1={home.y} x2={first.x + basepathExtend * Math.SQRT1_2} y2={first.y - basepathExtend * Math.SQRT1_2} stroke={DIRT} strokeWidth={geo.baseDist * 0.13} strokeLinecap="round" />
        <line x1={home.x} y1={home.y} x2={third.x - basepathExtend * Math.SQRT1_2} y2={third.y - basepathExtend * Math.SQRT1_2} stroke={DIRT} strokeWidth={geo.baseDist * 0.13} strokeLinecap="round" />
        <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke={DIRT} strokeWidth={geo.baseDist * 0.1} strokeLinecap="round" />
        <line x1={third.x} y1={third.y} x2={second.x} y2={second.y} stroke={DIRT} strokeWidth={geo.baseDist * 0.1} strokeLinecap="round" />

        {/* === Layer 7: Infield grass cutout === */}
        {(() => {
          const grassR = dirtArcR * 0.58;
          const grassCy = home.y - geo.baseDist * 0.72;
          return <circle cx={home.x} cy={grassCy} r={grassR} fill={GRASS} />;
        })()}

        {/* === Layer 8: Basepaths (chalk lines) === */}
        <polygon
          points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
          fill="none"
          stroke={CHALK}
          strokeWidth={1.5}
        />

        {/* === Layer 9: Batter's boxes === */}
        <rect x={home.x - boxW - 6} y={home.y - boxH / 2 - 2} width={boxW} height={boxH} fill="none" stroke={CHALK} strokeWidth={1} rx={1} />
        <rect x={home.x + 6} y={home.y - boxH / 2 - 2} width={boxW} height={boxH} fill="none" stroke={CHALK} strokeWidth={1} rx={1} />

        {/* Catcher's circle */}
        <path
          d={`M ${home.x - 12} ${home.y + 4} A 12 12 0 0 1 ${home.x + 12} ${home.y + 4}`}
          fill="none" stroke={CHALK} strokeWidth={1} opacity={0.6}
        />

        {/* === Layer 10: Bases (white diamonds) === */}
        {[first, second, third].map((b, i) => (
          <rect
            key={i}
            x={b.x - 5}
            y={b.y - 5}
            width={10}
            height={10}
            fill="white"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={0.5}
            transform={`rotate(45 ${b.x} ${b.y})`}
          />
        ))}

        {/* === Layer 11: Home plate (MLB pentagon) === */}
        <polygon points={homePlatePoints} fill="white" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />

        {/* === Layer 12: Pitcher's mound === */}
        <circle cx={mound.x} cy={mound.y} r={geo.baseDist * 0.12} fill={DIRT_DARK} />
        <circle cx={mound.x} cy={mound.y} r={geo.baseDist * 0.09} fill={DIRT} />
        <rect x={mound.x - 5} y={mound.y - 1.5} width={10} height={3} fill="white" rx={1} opacity={0.9} />

        {/* === Layer 13: Base labels === */}
        <text x={first.x + 10} y={first.y + 4} textAnchor="start" fill="white" fontSize="10" fontWeight="700" opacity={0.8} style={{ pointerEvents: 'none', userSelect: 'none' }}>1B</text>
        <text x={second.x} y={second.y - 10} textAnchor="middle" fill="white" fontSize="10" fontWeight="700" opacity={0.8} style={{ pointerEvents: 'none', userSelect: 'none' }}>2B</text>
        <text x={third.x - 10} y={third.y + 4} textAnchor="end" fill="white" fontSize="10" fontWeight="700" opacity={0.8} style={{ pointerEvents: 'none', userSelect: 'none' }}>3B</text>
        <text x={home.x} y={home.y + 22} textAnchor="middle" fill="white" fontSize="10" fontWeight="700" opacity={0.8} style={{ pointerEvents: 'none', userSelect: 'none' }}>HP</text>

        {/* === Layer 14: Position zone highlight === */}
        {zonePos && (
          <circle
            cx={zonePos.x}
            cy={zonePos.y}
            r={20}
            fill="rgba(250,204,21,0.12)"
            stroke="rgba(250,204,21,0.35)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* === Layer 15: Fielding position labels === */}
        {Object.entries(geo.positions)
          .filter(([pos]) => !['1B', '2B', '3B'].includes(pos))
          .map(([pos, coord]) => (
            <text
              key={pos}
              x={coord.x}
              y={coord.y - 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="9"
              fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pos}
            </text>
          ))}

        {/* === Interaction layer: connecting line === */}
        <line
          x1={playerPos.x * W} y1={playerPos.y * W}
          x2={ballPos.x * W} y2={ballPos.y * W}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />

        {/* Player dot (red) */}
        <circle
          cx={playerPos.x * W}
          cy={playerPos.y * W}
          r={DOT_RADIUS}
          fill="#ef4444"
          stroke="white"
          strokeWidth={2.5}
          filter="url(#dotShadow)"
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown('player')}
        />
        <text x={playerPos.x * W} y={playerPos.y * W + DOT_RADIUS + 14} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          Player
        </text>

        {/* Ball dot (green) */}
        <circle
          cx={ballPos.x * W}
          cy={ballPos.y * W}
          r={DOT_RADIUS}
          fill="#22c55e"
          stroke="white"
          strokeWidth={2.5}
          filter="url(#dotShadow)"
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown('ball')}
        />
        <text x={ballPos.x * W} y={ballPos.y * W + DOT_RADIUS + 14} textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          Ball
        </text>
      </svg>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Player Start</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Ball Received</span>
      </div>
    </div>
  );
}
