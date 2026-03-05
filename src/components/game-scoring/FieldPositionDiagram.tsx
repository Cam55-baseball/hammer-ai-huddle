import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface FieldPositionDiagramProps {
  sport: 'baseball' | 'softball';
  onUpdate: (data: { playerPos: Point; ballPos: Point }) => void;
}

const DOT_RADIUS = 8;

export function FieldPositionDiagram({ sport, onUpdate }: FieldPositionDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [playerPos, setPlayerPos] = useState<Point>({ x: 0.5, y: 0.65 });
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

  // Field dimensions in SVG viewBox (400x400)
  const W = 400;
  const cx = W / 2;
  const homeY = W - 40;
  const infieldRadius = sport === 'softball' ? 100 : 120;
  const outfieldRadius = sport === 'softball' ? 180 : 220;

  // Diamond points
  const home = { x: cx, y: homeY };
  const first = { x: cx + infieldRadius * 0.707, y: homeY - infieldRadius * 0.707 };
  const second = { x: cx, y: homeY - infieldRadius };
  const third = { x: cx - infieldRadius * 0.707, y: homeY - infieldRadius * 0.707 };

  // Foul lines extend to outfield
  const foulRight = { x: cx + outfieldRadius * 0.707, y: homeY - outfieldRadius * 0.707 };
  const foulLeft = { x: cx - outfieldRadius * 0.707, y: homeY - outfieldRadius * 0.707 };

  return (
    <div className="w-full max-w-[320px] mx-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${W}`}
        className="w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grass background */}
        <rect width={W} height={W} className="fill-green-800/20 dark:fill-green-900/30" rx={8} />

        {/* Outfield arc */}
        <path
          d={`M ${foulLeft.x} ${foulLeft.y} A ${outfieldRadius} ${outfieldRadius} 0 0 1 ${foulRight.x} ${foulRight.y}`}
          fill="none"
          className="stroke-green-600/40 dark:stroke-green-500/30"
          strokeWidth={2}
        />

        {/* Warning track arc */}
        <path
          d={`M ${foulLeft.x - 10} ${foulLeft.y - 10} A ${outfieldRadius + 20} ${outfieldRadius + 20} 0 0 1 ${foulRight.x + 10} ${foulRight.y - 10}`}
          fill="none"
          className="stroke-amber-700/20"
          strokeWidth={8}
        />

        {/* Foul lines */}
        <line x1={home.x} y1={home.y} x2={foulLeft.x} y2={foulLeft.y} className="stroke-foreground/20" strokeWidth={1.5} />
        <line x1={home.x} y1={home.y} x2={foulRight.x} y2={foulRight.y} className="stroke-foreground/20" strokeWidth={1.5} />

        {/* Infield dirt circle */}
        <circle cx={cx} cy={homeY - infieldRadius * 0.5} r={infieldRadius * 0.55} className="fill-amber-700/15 dark:fill-amber-800/20" />

        {/* Diamond lines */}
        <polygon
          points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
          fill="none"
          className="stroke-foreground/30"
          strokeWidth={1.5}
        />

        {/* Bases */}
        {[home, first, second, third].map((b, i) => (
          <rect
            key={i}
            x={b.x - 5}
            y={b.y - 5}
            width={10}
            height={10}
            className={cn(i === 0 ? 'fill-foreground/40' : 'fill-foreground/60')}
            transform={`rotate(45 ${b.x} ${b.y})`}
          />
        ))}

        {/* Pitcher's mound */}
        <circle cx={cx} cy={homeY - infieldRadius * 0.45} r={6} className="fill-amber-600/30 dark:fill-amber-500/20" />

        {/* Player position dot (red) */}
        <circle
          cx={playerPos.x * W}
          cy={playerPos.y * W}
          r={DOT_RADIUS}
          className="fill-red-500 stroke-white cursor-grab active:cursor-grabbing"
          strokeWidth={2}
          onPointerDown={handlePointerDown('player')}
        />
        <text x={playerPos.x * W} y={playerPos.y * W + DOT_RADIUS + 12} textAnchor="middle" className="fill-red-500 text-[10px] font-bold select-none pointer-events-none">
          Player
        </text>

        {/* Ball reception dot (green) */}
        <circle
          cx={ballPos.x * W}
          cy={ballPos.y * W}
          r={DOT_RADIUS}
          className="fill-green-400 stroke-white cursor-grab active:cursor-grabbing"
          strokeWidth={2}
          onPointerDown={handlePointerDown('ball')}
        />
        <text x={ballPos.x * W} y={ballPos.y * W + DOT_RADIUS + 12} textAnchor="middle" className="fill-green-400 text-[10px] font-bold select-none pointer-events-none">
          Ball
        </text>

        {/* Connecting line */}
        <line
          x1={playerPos.x * W} y1={playerPos.y * W}
          x2={ballPos.x * W} y2={ballPos.y * W}
          className="stroke-foreground/20"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Player Start</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Ball Received</span>
      </div>
    </div>
  );
}
