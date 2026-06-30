/**
 * StrikeZoneMini — tiny 3x3 zone display used inside plan cards.
 * Highlights "attack" (green) and "avoid" (red) zones. Sport-aware labels.
 */
import { ALL_ZONES, zoneLabels, type ZoneId } from "@/lib/games/zoneMath";

interface Props {
  sport: "baseball" | "softball";
  attack?: string[] | null;
  avoid?: string[] | null;
  size?: number;
}

export function StrikeZoneMini({ sport, attack = [], avoid = [], size = 96 }: Props) {
  const labels = zoneLabels(sport);
  const a = new Set((attack ?? []).map(String));
  const v = new Set((avoid ?? []).map(String));
  const cell = Math.floor(size / 3);
  return (
    <div
      className="inline-grid rounded border border-border bg-card"
      style={{ gridTemplateColumns: `repeat(3, ${cell}px)`, width: cell * 3 }}
      aria-label="Strike zone"
    >
      {ALL_ZONES.map((z: ZoneId) => {
        const isAttack = a.has(z);
        const isAvoid = v.has(z);
        const bg = isAttack
          ? "bg-emerald-500/40"
          : isAvoid
          ? "bg-rose-500/40"
          : "bg-muted/30";
        return (
          <div
            key={z}
            className={`border border-border/40 flex items-center justify-center text-[9px] font-mono ${bg}`}
            style={{ width: cell, height: cell }}
            title={labels[z]}
          >
            {z}
          </div>
        );
      })}
    </div>
  );
}
