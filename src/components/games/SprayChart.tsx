/**
 * SprayChart — where the athlete's batted balls went, one dot per ball.
 * Read-only companion to FieldDirectionPicker (same field geometry and codes).
 * Every dot is a real logged ball; missing directions are simply absent.
 */
import { SPRAY_SPOTS, sprayOffset, type SprayBall } from "@/lib/games/spray";

const TYPE_CLASS: Record<string, string> = {
  line_drive: "fill-emerald-500",
  grounder: "fill-amber-500",
  fly: "fill-sky-500",
  popup: "fill-violet-500",
};

export function SprayChart({ balls, size = 240 }: { balls: SprayBall[]; size?: number }) {
  // Count how many balls share each spot so duplicates fan out deterministically.
  const seen = new Map<string, number>();
  const dots = balls.map((b) => {
    const n = seen.get(b.direction) ?? 0;
    seen.set(b.direction, n + 1);
    const spot = SPRAY_SPOTS[b.direction];
    const { dx, dy } = sprayOffset(n);
    return { x: spot.x + dx, y: spot.y + dy, type: b.type };
  });

  return (
    <div className="space-y-1.5">
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={`Spray chart: ${balls.length} batted balls`}
        className="rounded-md border bg-muted/20"
        data-testid="spray-chart"
      >
        {/* outfield arc */}
        <path d="M20 150 A 110 110 0 0 1 180 150 Z" className="fill-emerald-500/10 stroke-border" strokeWidth={1} />
        {/* infield diamond */}
        <path d="M100 155 L145 110 L100 68 L55 110 Z" className="fill-amber-500/10 stroke-border" strokeWidth={1} />
        {/* foul lines */}
        <line x1="100" y1="155" x2="20" y2="72" className="stroke-border" strokeWidth={1} />
        <line x1="100" y1="155" x2="180" y2="72" className="stroke-border" strokeWidth={1} />
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={4}
            className={TYPE_CLASS[d.type ?? ""] ?? "fill-foreground/70"}
          >
            <title>{d.type ? d.type.replace(/_/g, " ") : "Batted ball"}</title>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Line drive</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Grounder</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Fly</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" /> Popup</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-foreground/70" /> Other / not labeled</span>
      </div>
    </div>
  );
}
