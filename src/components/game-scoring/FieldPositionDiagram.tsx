import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

// Typical defensive position zones (normalized 0-1 coordinates)
const POSITION_ZONES: Record<string, { x: number; y: number }> = {
  'P':  { x: 0.50, y: 0.58 },
  'C':  { x: 0.50, y: 0.92 },
  '1B': { x: 0.62, y: 0.62 },
  '2B': { x: 0.56, y: 0.52 },
  'SS': { x: 0.44, y: 0.52 },
  '3B': { x: 0.38, y: 0.62 },
  'LF': { x: 0.28, y: 0.35 },
  'CF': { x: 0.50, y: 0.25 },
  'RF': { x: 0.72, y: 0.35 },
};

export function FieldPositionDiagram({ sport, position, onUpdate }: FieldPositionDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Initialize player dot at typical position zone if available
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

  // ── Field geometry ──────────────────────────────────────────────
  // All units in SVG viewBox (500x500)
  const W = 500;
  const cx = W / 2; // 250

  // Home plate near bottom
  const homeY = W - 50;
  const homeX = cx;

  // Scale factor: baseball 90ft basepaths, softball 60ft
  // We'll map baseball 90ft = 150 SVG units, softball 60ft = 120 SVG units
  const baseDist = sport === 'softball' ? 120 : 150;

  // Diamond corners (45-degree rotated square)
  const diagDist = baseDist * Math.SQRT1_2; // basepath projected on each axis
  const home:   Point = { x: homeX, y: homeY };
  const first:  Point = { x: homeX + diagDist, y: homeY - diagDist };
  const second: Point = { x: homeX, y: homeY - baseDist };
  const third:  Point = { x: homeX - diagDist, y: homeY - diagDist };

  // Mound: baseball 60.5/90 ≈ 0.672, softball 43/60 ≈ 0.717
  const moundRatio = sport === 'softball' ? 0.717 : 0.672;
  const moundY = homeY - baseDist * moundRatio;

  // Outfield fence arc
  // baseball ~320ft (3.56x basepath), softball ~220ft (3.67x basepath)
  const outfieldRadius = sport === 'softball' ? baseDist * 3.2 : baseDist * 3.0;

  // Foul line endpoints (extend to edge of viewBox, 45 degrees)
  const foulLineLen = W * 0.65;
  const foulRight: Point = { x: homeX + foulLineLen * Math.SQRT1_2, y: homeY - foulLineLen * Math.SQRT1_2 };
  const foulLeft:  Point = { x: homeX - foulLineLen * Math.SQRT1_2, y: homeY - foulLineLen * Math.SQRT1_2 };

  // Infield dirt arc center & radius
  const dirtCenter: Point = { x: cx, y: homeY - baseDist * 0.5 };
  const dirtRadius = baseDist * 0.62;

  // Warning track arc (slightly beyond outfield arc visible area)
  const warningR = outfieldRadius * 0.78;

  // Home plate pentagon
  const hp = home;
  const hpSize = 8;
  const homePlatePoints = [
    `${hp.x},${hp.y - hpSize}`,
    `${hp.x + hpSize * 0.7},${hp.y - hpSize * 0.3}`,
    `${hp.x + hpSize * 0.7},${hp.y + hpSize * 0.3}`,
    `${hp.x - hpSize * 0.7},${hp.y + hpSize * 0.3}`,
    `${hp.x - hpSize * 0.7},${hp.y - hpSize * 0.3}`,
  ].join(' ');

  // Position zone highlight
  const zonePos = position && POSITION_ZONES[position];

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${W}`}
        className="w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background */}
        <rect width={W} height={W} className="fill-green-800/15 dark:fill-green-900/25" rx={10} />

        {/* Outfield grass fill (arc wedge from home) */}
        <path
          d={`M ${homeX} ${homeY} L ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y} Z`}
          className="fill-green-700/12 dark:fill-green-800/15"
        />

        {/* Warning track arc */}
        <path
          d={`M ${homeX - warningR * Math.SQRT1_2} ${homeY - warningR * Math.SQRT1_2} A ${warningR} ${warningR} 0 0 1 ${homeX + warningR * Math.SQRT1_2} ${homeY - warningR * Math.SQRT1_2}`}
          fill="none"
          className="stroke-amber-700/15"
          strokeWidth={10}
        />

        {/* Outfield fence arc */}
        <path
          d={`M ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y}`}
          fill="none"
          className="stroke-green-600/35 dark:stroke-green-500/25"
          strokeWidth={2.5}
        />

        {/* Foul lines */}
        <line x1={home.x} y1={home.y} x2={foulLeft.x} y2={foulLeft.y} className="stroke-foreground/15" strokeWidth={1.5} />
        <line x1={home.x} y1={home.y} x2={foulRight.x} y2={foulRight.y} className="stroke-foreground/15" strokeWidth={1.5} />

        {/* Infield dirt circle */}
        <circle cx={dirtCenter.x} cy={dirtCenter.y} r={dirtRadius} className="fill-amber-700/12 dark:fill-amber-800/15" />

        {/* Infield grass (smaller circle inside dirt) */}
        <circle cx={dirtCenter.x} cy={dirtCenter.y} r={dirtRadius * 0.55} className="fill-green-700/10 dark:fill-green-800/12" />

        {/* Diamond basepaths */}
        <polygon
          points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
          fill="none"
          className="stroke-foreground/25"
          strokeWidth={1.5}
        />

        {/* Bases */}
        {[first, second, third].map((b, i) => (
          <rect
            key={i}
            x={b.x - 5}
            y={b.y - 5}
            width={10}
            height={10}
            className="fill-foreground/50"
            transform={`rotate(45 ${b.x} ${b.y})`}
          />
        ))}

        {/* Home plate (pentagon) */}
        <polygon points={homePlatePoints} className="fill-foreground/40" />

        {/* Pitcher's mound */}
        <circle cx={cx} cy={moundY} r={7} className="fill-amber-600/25 dark:fill-amber-500/18" />
        <rect x={cx - 4} y={moundY - 1.5} width={8} height={3} className="fill-foreground/30" rx={1} />

        {/* Position zone highlight */}
        {zonePos && (
          <circle
            cx={zonePos.x * W}
            cy={zonePos.y * W}
            r={24}
            className="fill-primary/10 stroke-primary/20"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Connecting line */}
        <line
          x1={playerPos.x * W} y1={playerPos.y * W}
          x2={ballPos.x * W} y2={ballPos.y * W}
          className="stroke-foreground/15"
          strokeWidth={1}
          strokeDasharray="5 3"
        />

        {/* Player position dot (red) */}
        <circle
          cx={playerPos.x * W}
          cy={playerPos.y * W}
          r={DOT_RADIUS}
          className="fill-red-500 stroke-white cursor-grab active:cursor-grabbing"
          strokeWidth={2.5}
          onPointerDown={handlePointerDown('player')}
        />
        <text x={playerPos.x * W} y={playerPos.y * W + DOT_RADIUS + 14} textAnchor="middle" className="fill-red-500 text-[10px] font-bold select-none pointer-events-none">
          Player
        </text>

        {/* Ball reception dot (green) */}
        <circle
          cx={ballPos.x * W}
          cy={ballPos.y * W}
          r={DOT_RADIUS}
          className="fill-green-400 stroke-white cursor-grab active:cursor-grabbing"
          strokeWidth={2.5}
          onPointerDown={handlePointerDown('ball')}
        />
        <text x={ballPos.x * W} y={ballPos.y * W + DOT_RADIUS + 14} textAnchor="middle" className="fill-green-400 text-[10px] font-bold select-none pointer-events-none">
          Ball
        </text>
      </svg>
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Player Start</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Ball Received</span>
      </div>
    </div>
  );
}
