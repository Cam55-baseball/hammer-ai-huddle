import { useState, useRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface FieldPositionDiagramProps {
  sport: 'baseball' | 'softball';
  position?: string;
  onUpdate: (data: { playerPos: Point; ballPos: Point }) => void;
}

const DOT_RADIUS = 12;

const POSITION_ZONES: Record<string, { x: number; y: number }> = {
  'P':  { x: 0.50, y: 0.65 },
  'C':  { x: 0.50, y: 0.88 },
  '1B': { x: 0.70, y: 0.70 },
  '2B': { x: 0.56, y: 0.50 },
  'SS': { x: 0.42, y: 0.58 },
  '3B': { x: 0.30, y: 0.70 },
  'LF': { x: 0.30, y: 0.30 },
  'CF': { x: 0.50, y: 0.20 },
  'RF': { x: 0.70, y: 0.30 },
};

// Field colors
const GRASS_DARK = '#3d7a1e';
const GRASS_LIGHT = '#4a8c2a';
const GRASS_STRIPE = '#439225';
const DIRT = '#c4956a';
const DIRT_DARK = '#b8845a';
const CHALK = 'rgba(255,255,255,0.7)';
const FENCE = '#2d5a1a';

function midpoint(a: Point, b: Point, t = 0.5): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function expand(center: Point, pt: Point, factor: number): Point {
  return {
    x: center.x + (pt.x - center.x) * factor,
    y: center.y + (pt.y - center.y) * factor,
  };
}

export function FieldPositionDiagram({ sport, position, onUpdate }: FieldPositionDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const initialPlayerPos = position && POSITION_ZONES[position]
    ? POSITION_ZONES[position]
    : { x: 0.50, y: 0.60 };

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

  const W = 500;
  const cx = W / 2;
  const homeY = W - 50;
  const homeX = cx;
  const baseDist = sport === 'softball' ? 120 : 150;
  const diagDist = baseDist * Math.SQRT1_2;

  const home: Point = { x: homeX, y: homeY };
  const first: Point = { x: homeX + diagDist, y: homeY - diagDist };
  const second: Point = { x: homeX, y: homeY - baseDist };
  const third: Point = { x: homeX - diagDist, y: homeY - diagDist };

  const moundRatio = sport === 'softball' ? 0.717 : 0.672;
  const moundY = homeY - baseDist * moundRatio;

  const outfieldRadius = sport === 'softball' ? baseDist * 3.2 : baseDist * 3.0;
  const foulLineLen = W * 0.65;
  const foulRight: Point = { x: homeX + foulLineLen * Math.SQRT1_2, y: homeY - foulLineLen * Math.SQRT1_2 };
  const foulLeft: Point = { x: homeX - foulLineLen * Math.SQRT1_2, y: homeY - foulLineLen * Math.SQRT1_2 };

  // Diamond center for dirt expansion
  const diamondCenter = midpoint(home, second);
  const dirtExpand = 1.35;
  const dirtHome = expand(diamondCenter, home, dirtExpand);
  const dirtFirst = expand(diamondCenter, first, dirtExpand);
  const dirtSecond = expand(diamondCenter, second, dirtExpand);
  const dirtThird = expand(diamondCenter, third, dirtExpand);

  // Inner grass cutout (smaller diamond inside dirt)
  const grassExpand = 0.55;
  const grassHome = expand(diamondCenter, home, grassExpand);
  const grassFirst = expand(diamondCenter, first, grassExpand);
  const grassSecond = expand(diamondCenter, second, grassExpand);
  const grassThird = expand(diamondCenter, third, grassExpand);

  const warningR = outfieldRadius * 0.78;

  const hpSize = 8;
  const homePlatePoints = [
    `${home.x},${home.y - hpSize}`,
    `${home.x + hpSize * 0.7},${home.y - hpSize * 0.3}`,
    `${home.x + hpSize * 0.7},${home.y + hpSize * 0.3}`,
    `${home.x - hpSize * 0.7},${home.y + hpSize * 0.3}`,
    `${home.x - hpSize * 0.7},${home.y - hpSize * 0.3}`,
  ].join(' ');

  const zonePos = position && POSITION_ZONES[position];

  // Grass stripe pattern
  const stripeWidth = 28;
  const stripeCount = Math.ceil(W / stripeWidth);

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${W}`}
        className="w-full touch-none select-none rounded-xl overflow-hidden"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <filter id="dotShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background - darker green (foul territory) */}
        <rect width={W} height={W} fill={GRASS_DARK} rx={12} />

        {/* Fair territory grass (lighter green wedge) */}
        <path
          d={`M ${homeX} ${homeY} L ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y} Z`}
          fill={GRASS_LIGHT}
        />

        {/* Mowing stripes on fair territory */}
        <clipPath id="fairClip">
          <path d={`M ${homeX} ${homeY} L ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y} Z`} />
        </clipPath>
        <g clipPath="url(#fairClip)">
          {Array.from({ length: stripeCount }, (_, i) => (
            i % 2 === 0 ? (
              <rect key={i} x={i * stripeWidth} y={0} width={stripeWidth} height={W} fill={GRASS_STRIPE} opacity={0.3} />
            ) : null
          ))}
        </g>

        {/* Warning track arc */}
        <path
          d={`M ${homeX - warningR * Math.SQRT1_2} ${homeY - warningR * Math.SQRT1_2} A ${warningR} ${warningR} 0 0 1 ${homeX + warningR * Math.SQRT1_2} ${homeY - warningR * Math.SQRT1_2}`}
          fill="none"
          stroke={DIRT_DARK}
          strokeWidth={12}
          opacity={0.5}
        />

        {/* Outfield fence */}
        <path
          d={`M ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y}`}
          fill="none"
          stroke={FENCE}
          strokeWidth={3.5}
        />

        {/* Foul lines (chalk) */}
        <line x1={home.x} y1={home.y} x2={foulLeft.x} y2={foulLeft.y} stroke={CHALK} strokeWidth={2} />
        <line x1={home.x} y1={home.y} x2={foulRight.x} y2={foulRight.y} stroke={CHALK} strokeWidth={2} />

        {/* Infield dirt — diamond shape (rotated square) */}
        <polygon
          points={`${dirtHome.x},${dirtHome.y} ${dirtFirst.x},${dirtFirst.y} ${dirtSecond.x},${dirtSecond.y} ${dirtThird.x},${dirtThird.y}`}
          fill={DIRT}
        />

        {/* Infield grass cutout — smaller diamond inside dirt */}
        <polygon
          points={`${grassHome.x},${grassHome.y} ${grassFirst.x},${grassFirst.y} ${grassSecond.x},${grassSecond.y} ${grassThird.x},${grassThird.y}`}
          fill={GRASS_LIGHT}
        />

        {/* Basepaths (chalk) */}
        <polygon
          points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
          fill="none"
          stroke={CHALK}
          strokeWidth={2}
        />

        {/* Bases (white diamonds) */}
        {[first, second, third].map((b, i) => (
          <rect
            key={i}
            x={b.x - 5}
            y={b.y - 5}
            width={10}
            height={10}
            fill="white"
            transform={`rotate(45 ${b.x} ${b.y})`}
          />
        ))}

        {/* Home plate */}
        <polygon points={homePlatePoints} fill="white" />

        {/* Base labels at actual base positions */}
        <text x={first.x + 12} y={first.y + 4} textAnchor="start" fill="white" fontSize="11" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>1B</text>
        <text x={second.x} y={second.y - 12} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>2B</text>
        <text x={third.x - 12} y={third.y + 4} textAnchor="end" fill="white" fontSize="11" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>3B</text>
        <text x={home.x} y={home.y + 18} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" style={{ pointerEvents: 'none', userSelect: 'none' }}>HP</text>

        {/* Pitcher's mound dirt */}
        <circle cx={cx} cy={moundY} r={8} fill={DIRT} />
        {/* Rubber */}
        <rect x={cx - 4} y={moundY - 1.5} width={8} height={3} fill="white" opacity={0.85} rx={1} />

        {/* Position zone highlight */}
        {zonePos && (
          <circle
            cx={zonePos.x * W}
            cy={zonePos.y * W}
            r={24}
            fill="rgba(250,204,21,0.15)"
            stroke="rgba(250,204,21,0.4)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Fielding position labels (exclude base positions to avoid duplication) */}
        {Object.entries(POSITION_ZONES)
          .filter(([pos]) => !['1B', '2B', '3B'].includes(pos))
          .map(([pos, coord]) => (
          <text
            key={pos}
            x={coord.x * W}
            y={coord.y * W - 16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.6)"
            fontSize="9"
            fontWeight="600"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {pos}
          </text>
        ))}

        {/* Connecting line */}
        <line
          x1={playerPos.x * W} y1={playerPos.y * W}
          x2={ballPos.x * W} y2={ballPos.y * W}
          stroke="rgba(255,255,255,0.25)"
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
