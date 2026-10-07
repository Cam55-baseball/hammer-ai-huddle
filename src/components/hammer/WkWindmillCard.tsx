/**
 * WkWindmillCard — softball windmill pitching program (owner approved 2026-10-07).
 * Shows the day's drills and pitches; the plan builder owns every number.
 */
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";
import { WkPrescriptionCard } from "@/components/hammer/WkPrescriptionCard";
import { WkCardCompletion } from "@/components/hammer/WkCardCompletion";
import { useCanonicalPhaseDisplay } from "@/hooks/useCanonicalPhaseDisplay";

const TYPE_LABEL: Record<string, string> = {
  drills: "Drill day",
  build: "Fastball and change-up",
  movement: "Movement pitches",
  game_like: "Game-ready pitching",
  maintain: "Between-games pitching",
  sharpen: "Light — game tomorrow",
};

export function WkWindmillCard() {
  const { grouped, snapshotIdentity } = useHammersToday();
  const items = (grouped as any).windmillCard ?? [];
  const { display: label } = useCanonicalPhaseDisplay(snapshotIdentity.season_display, snapshotIdentity.season_phase);
  const summary = (items[0]?.why_payload as any)?.windmill ?? null;
  if (items.length === 0) return null;
  return (
    <div className="space-y-2" data-card-type="windmill">
      {summary && (
        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs leading-5">
          <div><span className="text-muted-foreground">Session type:</span> {TYPE_LABEL[summary.type] ?? summary.type}</div>
          <div><span className="text-muted-foreground">Full pitches today:</span> {summary.full_pitches}</div>
          {summary.drill_throws > 0 && <div><span className="text-muted-foreground">Easy drill throws:</span> {summary.drill_throws} (each counts as a quarter pitch)</div>}
          {(summary.reasons ?? []).map((r: string, i: number) => <div key={i} className="text-muted-foreground">• {r}</div>)}
        </div>
      )}
      {items.map((rx: any) => <WkPrescriptionCard key={rx.id} rx={rx} phaseDisplay={label} phaseKey={snapshotIdentity.season_phase} allowSwap={false} />)}
      <p className="text-[11px] text-muted-foreground">Stop and tell a coach if your shoulder, elbow or forearm hurts.</p>
      <WkCardCompletion modality="windmill" modalityLabel="Windmill pitching" items={items} />
    </div>
  );
}
