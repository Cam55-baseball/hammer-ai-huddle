import { useMemo, useState } from "react";
import { useCategoryInputs } from "@/hooks/useCategoryScore";
import { scoreCard, type Audience, type TileOutcome, type TileReading } from "@/lib/reportCard/categories/scoring";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const REASONS: Record<string, string> = {
  waiting_on_athlete_baseline: "Waiting on this athlete's own range.",
  nothing_measurable_in_this_clip: "Nothing in this category could be measured from this clip.",
  too_many_tiles_not_measured: "Not enough of this category could be measured from this clip.",
  no_movement_detected: "No swing or throw was found in this clip, so nothing is scored.",
  body_not_tracked: "The body couldn't be tracked in this clip, so nothing is scored.",
  no_saved_body_tracking: "This clip has no saved body tracking, so categories can't be scored.",
  body_tracking_unreadable: "This clip's body tracking couldn't be read.",
};
const why = (r: string | null) => {
  if (!r) return "";
  if (r.startsWith("non_negotiable_not_measured")) return "A must-have check in this category couldn't be measured, so it isn't scored.";
  return REASONS[r] ?? "Not scored from this clip.";
};
const outcomeLabel = (o: TileOutcome) => {
  switch (o.status) {
    case "scored": return o.frac >= 1 ? "Pass" : o.frac <= 0 ? "Needs work" : "Partial";
    case "waiting_on_baseline": return "Recorded";
    case "ungraded": return "Measured, not graded";
    case "not_applicable": return o.reason.startsWith("pitcher_not_in_frame") ? "Needs pitcher in frame" : "Doesn't apply";
    default: return o.reason === "staff_only_until_validated" ? "Staff only" : "Not measured";
  }
};
const flagLabel = (r: TileReading) => (r.kind === "verdict" ? (r.pass ? "Clear" : "Raised") : "Not checked");

export function CategoryScoreCard({ videoId, sport, module, side }: { videoId: string | null; sport?: string; module?: string; side: "L" | "R" | null }) {
  const { loading, data } = useCategoryInputs(videoId, sport, module, side);
  const [audience, setAudience] = useState<Audience>("athlete");
  const card = useMemo(() => (data && "spec" in data ? scoreCard(data.spec, data.raw, { audience }) : null), [data, audience]);

  if (loading) return <p className="text-xs text-muted-foreground">Scoring categories…</p>;
  if (!data) return null;
  if ("refused" in data) return <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{why(data.refused)}</p>;
  if (!card) return null;

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Category scores</p>
          <p className="text-2xl font-black text-foreground">
            {card.total != null ? <>{card.total}<span className="text-sm font-semibold text-muted-foreground"> / 100</span></> : <span className="text-base font-semibold text-muted-foreground">{card.totalReason === "no_total_for_this_card" ? "No total for this card" : "Total not available — some categories incomplete"}</span>}
          </p>
        </div>
        <div className="flex gap-1">
          {(["athlete", "staff"] as const).map((a) => (
            <Button key={a} size="sm" variant={audience === a ? "default" : "outline"} onClick={() => setAudience(a)}>{a === "athlete" ? "Athlete view" : "Staff view"}</Button>
          ))}
        </div>
      </div>

      {card.sections.map((s) => (
        <div key={s.key} className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-sm font-bold text-foreground">{s.title}</p>
          <p className="text-xs text-muted-foreground">{s.note}</p>
          {s.tiles.map((t) => (
            <div key={t.key} className="flex items-center justify-between text-sm"><span>{t.name}</span><Badge variant="outline">{flagLabel(t.reading)}</Badge></div>
          ))}
        </div>
      ))}

      {card.categories.map((c) => (
        <div key={c.key} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-foreground">{c.title}</p>
            <p className="text-sm font-semibold text-foreground">{c.score != null ? `${c.score} / ${c.points}` : <span className="text-muted-foreground">Incomplete</span>}</p>
          </div>
          <Progress value={c.score != null && c.points > 0 ? (c.score / c.points) * 100 : 0} />
          {c.status === "incomplete" && <p className="text-xs text-muted-foreground">{why(c.incompleteReason)}</p>}
          {c.notApplicable.length > 0 && <p className="text-xs text-muted-foreground">Not counted here (needs the pitcher in frame or doesn't apply to this clip): {c.notApplicable.join(", ")}.</p>}
          <ul className="space-y-1">
            {c.tiles.filter((t) => t.points > 0 || t.outcome.status === "waiting_on_baseline" || t.outcome.status === "scored").map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground">{t.name}{t.nonNegotiable ? " ★" : ""}</span>
                <Badge variant="secondary">{outcomeLabel(t.outcome)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>★ Must-have check. A category isn't scored unless all of its must-haves were measured.</p>
        {card.notes.map((n) => <p key={n}>{n}</p>)}
      </div>
    </section>
  );
}
