/**
 * StrikeZoneGrid — shared 9-zone strike-zone surface.
 *
 * Used by:
 *  - PitchLogger (tap to set zone for a logged pitch)
 *  - StrikeZonePlanner (tag zones as attack / avoid / take for a pitcher dossier)
 *  - GameReports heat map (color a zone by aggregate value)
 *
 * Zone layout (catcher's view, batter standing at home):
 *   1 2 3      ← high
 *   4 5 6
 *   7 8 9      ← low
 * Out-of-zone bands: UP, DN, IN, OUT.
 *
 * Stateless: parent owns the value; this component only renders + emits.
 */
import { cn } from "@/lib/utils";

export type Zone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type OutZone = "UP" | "DN" | "IN" | "OUT" | null;

export interface ZoneValue {
  zone: Zone | null;
  outZone?: OutZone;
}

/** Plan tag per zone (Phase 4). */
export type ZoneTag = "attack" | "avoid" | "take" | null;
const TAG_COLORS: Record<Exclude<ZoneTag, null>, string> = {
  attack: "fill-emerald-500/40 stroke-emerald-500",
  avoid: "fill-rose-500/30 stroke-rose-500",
  take: "fill-amber-400/30 stroke-amber-500",
};

interface Props {
  /** Single-pick mode (logger). */
  value?: ZoneValue;
  onChange?: (v: ZoneValue) => void;
  /** Plan mode: per-zone tags. */
  tags?: Partial<Record<Zone, ZoneTag>>;
  onTagChange?: (zone: Zone, next: ZoneTag) => void;
  /** Heat-map mode: per-zone color (0–1 intensity, blue→red). */
  heat?: Partial<Record<Zone, number>>;
  /** Heat-map mode: per-zone tooltip label (e.g. ".412 BA"). */
  heatLabels?: Partial<Record<Zone, string>>;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OUT_ZONES: Exclude<OutZone, null>[] = ["UP", "IN", "OUT", "DN"];

function heatColor(intensity: number): string {
  // 0 → cool blue, 1 → hot red
  const t = Math.max(0, Math.min(1, intensity));
  const r = Math.round(50 + t * 205);
  const g = Math.round(120 - t * 80);
  const b = Math.round(220 - t * 200);
  return `rgba(${r},${g},${b},0.55)`;
}

export function StrikeZoneGrid({
  value,
  onChange,
  tags,
  onTagChange,
  heat,
  heatLabels,
  size = 220,
  readOnly = false,
  className,
}: Props) {
  const planMode = !!onTagChange;
  const heatMode = !!heat;

  const cycleTag = (current: ZoneTag): ZoneTag => {
    if (current === null) return "attack";
    if (current === "attack") return "avoid";
    if (current === "avoid") return "take";
    return null;
  };

  // SVG geometry
  const pad = 26; // band for out-of-zone tags
  const inner = size - pad * 2;
  const cell = inner / 3;

  const handleZoneClick = (z: Zone) => {
    if (readOnly) return;
    if (planMode) {
      onTagChange?.(z, cycleTag(tags?.[z] ?? null));
      return;
    }
    onChange?.({ zone: z, outZone: null });
  };

  const handleOutClick = (o: Exclude<OutZone, null>) => {
    if (readOnly || planMode || heatMode) return;
    onChange?.({ zone: null, outZone: o });
  };

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <svg width={size} height={size} className="select-none">
        {/* Out-of-zone bands */}
        {OUT_ZONES.map((band) => {
          const isActive = value?.outZone === band;
          const common = {
            className: cn(
              "transition-colors",
              isActive ? "fill-primary/20 stroke-primary" : "fill-muted/30 stroke-border",
              !planMode && !heatMode && !readOnly ? "cursor-pointer hover:fill-muted/60" : "",
            ),
            strokeWidth: 1,
            onClick: () => handleOutClick(band),
          };
          if (band === "UP") return <rect key={band} x={pad} y={2} width={inner} height={pad - 4} {...common} />;
          if (band === "DN") return <rect key={band} x={pad} y={size - pad + 2} width={inner} height={pad - 4} {...common} />;
          if (band === "IN") return <rect key={band} x={2} y={pad} width={pad - 4} height={inner} {...common} />;
          if (band === "OUT") return <rect key={band} x={size - pad + 2} y={pad} width={pad - 4} height={inner} {...common} />;
          return null;
        })}

        {/* Strike zone 3×3 */}
        {ZONES.map((z) => {
          const row = Math.floor((z - 1) / 3);
          const col = (z - 1) % 3;
          const x = pad + col * cell;
          const y = pad + row * cell;
          const active = !planMode && !heatMode && value?.zone === z;
          const tag = tags?.[z] ?? null;
          const intensity = heat?.[z];

          let fill: string | undefined;
          let strokeClass = "stroke-border";
          let fillClass = "fill-card";
          if (active) {
            fillClass = "fill-primary/30";
            strokeClass = "stroke-primary";
          } else if (planMode && tag) {
            const c = TAG_COLORS[tag];
            fillClass = c.split(" ")[0];
            strokeClass = c.split(" ")[1];
          } else if (heatMode && typeof intensity === "number") {
            fill = heatColor(intensity);
          }

          return (
            <g key={z}>
              <rect
                x={x}
                y={y}
                width={cell}
                height={cell}
                className={cn(
                  "transition-colors",
                  !fill && fillClass,
                  strokeClass,
                  !readOnly && "cursor-pointer hover:fill-muted",
                )}
                fill={fill}
                strokeWidth={1.5}
                onClick={() => handleZoneClick(z)}
              />
              <text
                x={x + cell / 2}
                y={y + cell / 2 + 4}
                textAnchor="middle"
                className="fill-foreground/60 text-[10px] font-medium pointer-events-none"
              >
                {heatMode ? (heatLabels?.[z] ?? "") : z}
              </text>
            </g>
          );
        })}
      </svg>
      {planMode && (
        <p className="text-[10px] text-muted-foreground">
          Tap zones to cycle: attack → avoid → take → clear
        </p>
      )}
    </div>
  );
}
