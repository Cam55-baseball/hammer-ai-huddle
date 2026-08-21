/**
 * StandardTargetLine — the "here's the mark" line shown inside the log sheet
 * for any movement that feeds a weight-room standard.
 *
 * Display only. It shows the next tier's target (converted to real pounds when
 * the mark is bodyweight-relative) and never alters the prescribed dose.
 */
import { Target, Trophy } from "lucide-react";
import { TIER_LABEL } from "@/lib/hammer/standards/catalog";
import { targetLoadLbs, type StandardProgress } from "@/lib/hammer/standards/evaluate";

export function StandardTargetLine({
  rows,
  bodyweightLbs,
}: {
  rows: StandardProgress[];
  bodyweightLbs: number | null;
}) {
  const visible = rows.filter((r) => r.eligible);
  if (!visible.length) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
      {visible.map((p) => {
        const lbs = p.next ? targetLoadLbs(p.standard, p.next, bodyweightLbs) : null;
        return (
          <div key={p.standard.id} className="text-[11px] leading-snug">
            <div className="flex items-center gap-1.5 font-medium">
              {p.achieved ? <Trophy className="h-3 w-3 text-primary" /> : <Target className="h-3 w-3 text-primary" />}
              <span>{p.standard.name}</span>
              {p.achieved && <span className="text-primary">{TIER_LABEL[p.achieved]} held</span>}
            </div>
            <p className="text-muted-foreground">
              {p.next ? (
                <>
                  Next mark — <span className="font-medium text-foreground">{TIER_LABEL[p.next]}</span>:{" "}
                  {lbs !== null ? (
                    <>
                      {lbs} lb{p.standard.reps ? ` × ${p.standard.reps}` : ""} ({p.standard.targets[p.next]}
                      {" "}
                      {p.standard.unit})
                    </>
                  ) : (
                    <>
                      {p.standard.targets[p.next]} {p.standard.unit}
                      {p.standard.reps && p.standard.metric === "reps" ? " in one set" : ""}
                    </>
                  )}
                  {p.closing && <span className="ml-1 font-medium text-primary">You're one good set away.</span>}
                </>
              ) : (
                <>World Class held. Nothing above this — keep it.</>
              )}
            </p>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        Targets are marks to chase, not today's dose. Your prescribed sets and reps don't change.
      </p>
    </div>
  );
}

export default StandardTargetLine;
