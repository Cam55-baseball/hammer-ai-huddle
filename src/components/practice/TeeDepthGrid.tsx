import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeeDepthGridProps {
  value?: number; // 1-5
  onChange: (depth: number) => void;
  sport?: 'baseball' | 'softball';
  batterSide?: 'L' | 'R';
}

const depthPositions = [
  { value: 1, label: 'Front edge (shallowest)', short: 'F+1' },
  { value: 2, label: 'Front half', short: 'F0' },
  { value: 3, label: 'Center of plate', short: 'C0' },
  { value: 4, label: 'Back half', short: 'B0' },
  { value: 5, label: 'Back tip (deepest)', short: 'B-1' },
];

// MLB home plate pentagon (top-down): flat top edge toward pitcher, tip at bottom toward catcher.
// ViewBox: 0 0 170 200. Plate width = 170 (17" scaled x10). 
// Points: top-left(0,0) top-right(170,0) right-side(170,110) tip(85,200) left-side(0,110)
const PLATE_W = 170;
const PLATE_H = 200;
const RECT_H = 110; // height of the rectangular portion

// Polygon points for the full pentagon outline
const PENTAGON_POINTS = `0,0 ${PLATE_W},0 ${PLATE_W},${RECT_H} ${PLATE_W / 2},${PLATE_H} 0,${RECT_H}`;

// Each depth zone is a horizontal slice of the pentagon.
// We divide into 5 equal vertical slices of 40px each.
const SLICE_H = PLATE_H / 5; // 40px each

function getSlicePolygon(index: number): string {
  const y1 = index * SLICE_H;
  const y2 = (index + 1) * SLICE_H;

  // Calculate left and right x at any y
  const getX = (y: number): { left: number; right: number } => {
    if (y <= RECT_H) {
      return { left: 0, right: PLATE_W };
    }
    // In the triangular portion: interpolate from full width at RECT_H to tip at PLATE_H
    const t = (y - RECT_H) / (PLATE_H - RECT_H);
    const halfW = (PLATE_W / 2) * (1 - t);
    const cx = PLATE_W / 2;
    return { left: cx - halfW, right: cx + halfW };
  };

  const top = getX(y1);
  const bot = getX(y2);

  return `${top.left},${y1} ${top.right},${y1} ${bot.right},${y2} ${bot.left},${y2}`;
}

export function TeeDepthGrid({ value, onChange, sport = 'baseball', batterSide = 'R' }: TeeDepthGridProps) {
  const isLefty = batterSide === 'L';
  // Softball plate slightly wider proportionally — scale viewBox
  const viewW = sport === 'softball' ? 190 : PLATE_W;
  const xOffset = sport === 'softball' ? 10 : 0;

  return (
    <div className={cn('flex flex-col items-center', isLefty && 'scale-x-[-1]')}>
      <Label className={cn('text-[9px] text-muted-foreground mb-1 block text-center', isLefty && 'scale-x-[-1]')}>
        Tee Depth <span className="text-destructive">*</span>
      </Label>

      {/* Toward pitcher label */}
      <p className={cn('text-[8px] text-muted-foreground mb-0.5', isLefty && 'scale-x-[-1]')}>
        ↑ Pitcher
      </p>

      <TooltipProvider delayDuration={200}>
        <svg
          viewBox={`${-xOffset} -2 ${viewW} ${PLATE_H + 4}`}
          className="w-24 h-auto"
          aria-label="Home plate depth zones"
        >
          {/* Pentagon outline */}
          <polygon
            points={PENTAGON_POINTS}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5"
          />

          {/* 5 depth zone slices */}
          {depthPositions.map((pos, i) => {
            const selected = value === pos.value;
            const isCenter = pos.value === 3;
            const points = getSlicePolygon(i);
            const cy = i * SLICE_H + SLICE_H / 2;

            return (
              <Tooltip key={pos.value}>
                <TooltipTrigger asChild>
                  <g
                    onClick={() => onChange(pos.value)}
                    className="cursor-pointer"
                    role="button"
                    aria-label={pos.label}
                  >
                    <polygon
                      points={points}
                      fill={
                        selected
                          ? 'hsl(var(--primary) / 0.35)'
                          : isCenter
                            ? 'hsl(45 93% 47% / 0.15)'
                            : 'hsl(var(--muted) / 0.15)'
                      }
                      stroke={
                        selected
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--border) / 0.5)'
                      }
                      strokeWidth={selected ? '2' : '0.75'}
                      className="transition-all hover:fill-[hsl(var(--primary)/0.15)]"
                    />
                    <text
                      x={PLATE_W / 2}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight={selected ? '700' : '500'}
                      fill={
                        selected
                          ? 'hsl(var(--primary))'
                          : isCenter
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--muted-foreground))'
                      }
                      className={cn(isLefty && 'scale-x-[-1]')}
                      style={isLefty ? { transform: `scaleX(-1)`, transformOrigin: `${PLATE_W / 2}px ${cy}px` } : undefined}
                    >
                      {pos.short}
                    </text>
                  </g>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs px-2 py-1">
                  {pos.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </TooltipProvider>

      {/* Toward catcher label */}
      <p className={cn('text-[8px] text-muted-foreground mt-0.5', isLefty && 'scale-x-[-1]')}>
        ↓ Catcher
      </p>
    </div>
  );
}
