import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeeDepthGridProps {
  value?: number; // 1-5
  onChange: (depth: number) => void;
  sport?: 'baseball' | 'softball';
  batterSide?: 'L' | 'R';
}

// Reordered: F+1 off-plate front (pitcher), F0 front of plate, C0 center, B0 tip toward catcher, B-1 behind plate toward catcher
const depthPositions = [
  { value: 1, label: 'Off plate — in front (toward pitcher)', short: 'F+1', onPlate: false },
  { value: 2, label: 'Front of plate (toward pitcher)', short: 'F0', onPlate: true },
  { value: 3, label: 'Center of plate', short: 'C0', onPlate: true },
  { value: 4, label: 'Tip of plate (toward catcher)', short: 'B0', onPlate: true },
  { value: 5, label: 'Behind plate (toward catcher)', short: 'B-1', onPlate: false },
];

// MLB home plate pentagon (top-down): flat top edge toward pitcher, tip at bottom toward catcher.
// ViewBox includes extra space above and below for off-plate zones F+1 and B-1
const PLATE_W = 170;
const PLATE_H = 200;
const RECT_H = 110; // height of the rectangular portion

const PENTAGON_POINTS = `0,0 ${PLATE_W},0 ${PLATE_W},${RECT_H} ${PLATE_W / 2},${PLATE_H} 0,${RECT_H}`;

// Off-plate zone heights
const OFF_ZONE_H = 36;
// On-plate zones: divide plate into 3 equal slices
const PLATE_SLICE_H = PLATE_H / 3;

// Total SVG height: off-plate top + plate + off-plate bottom
const TOTAL_H = OFF_ZONE_H + PLATE_H + OFF_ZONE_H;
// Y offset: plate starts after top off-plate zone
const PLATE_Y_OFFSET = OFF_ZONE_H;

function getPlateX(y: number): { left: number; right: number } {
  if (y <= RECT_H) {
    return { left: 0, right: PLATE_W };
  }
  const t = (y - RECT_H) / (PLATE_H - RECT_H);
  const halfW = (PLATE_W / 2) * (1 - t);
  const cx = PLATE_W / 2;
  return { left: cx - halfW, right: cx + halfW };
}

function getZoneGeometry(index: number): { points: string; cy: number } {
  if (index === 0) {
    // F+1: off-plate above (toward pitcher)
    const y1 = 0;
    const y2 = PLATE_Y_OFFSET;
    return {
      points: `0,${y1} ${PLATE_W},${y1} ${PLATE_W},${y2} 0,${y2}`,
      cy: y1 + (y2 - y1) / 2,
    };
  }
  if (index === 4) {
    // B-1: off-plate below tip (toward catcher)
    const tipY = PLATE_Y_OFFSET + PLATE_H;
    const y2 = TOTAL_H;
    // Width tapers from tip width to a narrow rectangle
    const tipX = getPlateX(PLATE_H);
    return {
      points: `${tipX.left},${tipY} ${tipX.right},${tipY} ${PLATE_W * 0.65},${y2} ${PLATE_W * 0.35},${y2}`,
      cy: tipY + (y2 - tipY) / 2,
    };
  }
  // On-plate zones: index 1=F0, 2=C0, 3=B0 → plate slices 0, 1, 2
  const sliceIdx = index - 1;
  const localY1 = sliceIdx * PLATE_SLICE_H;
  const localY2 = (sliceIdx + 1) * PLATE_SLICE_H;
  const globalY1 = PLATE_Y_OFFSET + localY1;
  const globalY2 = PLATE_Y_OFFSET + localY2;

  const top = getPlateX(localY1);
  const bot = getPlateX(localY2);

  return {
    points: `${top.left},${globalY1} ${top.right},${globalY1} ${bot.right},${globalY2} ${bot.left},${globalY2}`,
    cy: globalY1 + (globalY2 - globalY1) / 2,
  };
}

export function TeeDepthGrid({ value, onChange, sport = 'baseball', batterSide = 'R' }: TeeDepthGridProps) {
  const isLefty = batterSide === 'L';
  const viewW = sport === 'softball' ? 190 : PLATE_W;
  const xOffset = sport === 'softball' ? 10 : 0;

  return (
    <div className={cn('flex flex-col items-center', isLefty && 'scale-x-[-1]')}>
      <Label className={cn('text-[9px] text-muted-foreground mb-1 block text-center', isLefty && 'scale-x-[-1]')}>
        Tee Depth <span className="text-destructive">*</span>
      </Label>

      <p className={cn('text-[8px] text-muted-foreground mb-0.5', isLefty && 'scale-x-[-1]')}>
        ↑ Pitcher
      </p>

      <TooltipProvider delayDuration={200}>
        <svg
          viewBox={`${-xOffset} -2 ${viewW} ${TOTAL_H + 4}`}
          className="w-44 h-auto"
          aria-label="Home plate depth zones"
        >
          {/* Pentagon outline (the actual plate) */}
          <polygon
            points={`0,${PLATE_Y_OFFSET} ${PLATE_W},${PLATE_Y_OFFSET} ${PLATE_W},${PLATE_Y_OFFSET + RECT_H} ${PLATE_W / 2},${PLATE_Y_OFFSET + PLATE_H} 0,${PLATE_Y_OFFSET + RECT_H}`}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5"
          />

          {/* 5 depth zones */}
          {depthPositions.map((pos, i) => {
            const selected = value === pos.value;
            const isCenter = pos.value === 3;
            const { points, cy } = getZoneGeometry(i);

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
                          : !pos.onPlate
                            ? 'hsl(var(--muted) / 0.08)'
                            : isCenter
                              ? 'hsl(45 93% 47% / 0.15)'
                              : 'hsl(var(--muted) / 0.15)'
                      }
                      stroke={
                        selected
                          ? 'hsl(var(--primary))'
                          : !pos.onPlate
                            ? 'hsl(var(--border) / 0.3)'
                            : 'hsl(var(--border) / 0.5)'
                      }
                      strokeWidth={selected ? '2' : '0.75'}
                      strokeDasharray={!pos.onPlate ? '4,3' : undefined}
                      className="transition-all hover:fill-[hsl(var(--primary)/0.15)]"
                    />
                    <text
                      x={PLATE_W / 2}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={pos.onPlate ? '14' : '11'}
                      fontWeight={selected ? '700' : '500'}
                      fill={
                        selected
                          ? 'hsl(var(--primary))'
                          : !pos.onPlate
                            ? 'hsl(var(--muted-foreground) / 0.6)'
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

      <p className={cn('text-[8px] text-muted-foreground mt-0.5', isLefty && 'scale-x-[-1]')}>
        ↓ Catcher
      </p>
    </div>
  );
}
