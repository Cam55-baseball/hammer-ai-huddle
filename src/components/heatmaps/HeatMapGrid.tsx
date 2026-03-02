import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HeatMapGridProps {
  gridSize: { rows: number; cols: number };
  gridData: number[][];
  colorScale: string[];
  blindZones?: number[][];
  blindZoneThreshold?: number;
  showZoneHighlight?: boolean;
  totalDataPoints?: number;
}

function interpolateColor(scale: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.5) {
    return lerpHex(scale[0], scale[1], clamped * 2);
  }
  return lerpHex(scale[1], scale[2], (clamped - 0.5) * 2);
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function ColorLegend({ colorScale }: { colorScale: string[] }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[9px] text-muted-foreground">Low</span>
      <div
        className="flex-1 h-2 rounded-sm"
        style={{
          background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]}, ${colorScale[2]})`,
        }}
      />
      <span className="text-[9px] text-muted-foreground">High</span>
    </div>
  );
}

export function HeatMapGrid({
  gridSize,
  gridData,
  colorScale,
  blindZones,
  blindZoneThreshold,
  showZoneHighlight = false,
  totalDataPoints,
}: HeatMapGridProps) {
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);

  const allValues = gridData.flat();
  const max = Math.max(...allValues, 1);
  const total = allValues.reduce((a, b) => a + b, 0);

  const isBlind = (r: number, c: number) =>
    blindZones?.some(([br, bc]) => br === r && bc === c) ?? false;

  const isInnerZone = (r: number, c: number) =>
    showZoneHighlight && gridSize.rows === 5 && gridSize.cols === 5 && r >= 1 && r <= 3 && c >= 1 && c <= 3;

  return (
    <div className="space-y-1">
      <div
        className="grid gap-0.5 w-full"
        style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)` }}
      >
        {Array.from({ length: gridSize.rows }, (_, r) =>
          Array.from({ length: gridSize.cols }, (_, c) => {
            const value = gridData[r]?.[c] ?? 0;
            const t = max > 0 ? value / max : 0;
            const blind = isBlind(r, c);
            const isHovered = hovered?.r === r && hovered?.c === c;
            const inner = isInnerZone(r, c);

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  'relative aspect-square rounded-sm cursor-default transition-transform flex items-center justify-center',
                  inner && 'ring-1 ring-green-400/30'
                )}
                style={{
                  backgroundColor: interpolateColor(colorScale, t),
                  border: blind
                    ? '2px dashed hsl(var(--muted-foreground) / 0.4)'
                    : '1px solid hsl(var(--border) / 0.3)',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHovered({ r, c })}
                onMouseLeave={() => setHovered(null)}
              >
                {blind && (
                  <span className="text-[7px] text-muted-foreground font-medium opacity-60">Low</span>
                )}
                {isHovered && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-0.5 rounded shadow whitespace-nowrap z-20">
                    {value} {blind && '(low data)'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ColorLegend colorScale={colorScale} />

      <div className="text-center">
        <span className="text-[10px] text-muted-foreground">
          N = {totalDataPoints ?? total} reps
        </span>
      </div>
    </div>
  );
}
