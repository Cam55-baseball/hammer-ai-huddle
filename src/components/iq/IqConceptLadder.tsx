/**
 * IqConceptLadder — athlete-facing mastery ladder rendered above the
 * scenario grid. Groups by concept, shows a mastery bar, rung pips per
 * situation, and lock badges when prerequisite concepts aren't mastered.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Lock, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { useIqConceptLadder, type LadderConcept, type LadderSituation } from "@/hooks/useIqConceptLadder";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { useNavigate } from "react-router-dom";
import { LENS_ACCENT } from "@/lib/iq/types";

function RungPips({ rung, size = "sm" }: { rung: number; size?: "sm" | "xs" }) {
  const s = size === "xs" ? "h-1 w-2" : "h-1.5 w-2.5";
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Difficulty rung ${rung} of 5`}>
      {[1, 2, 3, 4, 5].map((r) => (
        <span
          key={r}
          className={`${s} rounded-full ${r <= rung ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function ConceptRow({ row }: { row: LadderConcept }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pct = Math.max(0, Math.min(100, row.mastery));

  const renderSituation = (s: LadderSituation) => {
    const accent = s.situation.lens_tags[0] ? LENS_ACCENT[s.situation.lens_tags[0]] : "hsl(var(--primary))";
    return (
      <button
        key={s.situation.id}
        type="button"
        disabled={s.locked}
        onClick={() => !s.locked && navigate(`/iq/${s.situation.slug}`)}
        className={
          "w-full text-left flex items-center gap-3 rounded-md border px-3 py-2 transition-colors " +
          (s.locked
            ? "opacity-60 cursor-not-allowed bg-muted/20"
            : "hover:bg-accent hover:-translate-y-0.5")
        }
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{s.situation.title}</span>
            {s.mastery >= 85 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            {s.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <RungPips rung={s.rung} size="xs" />
            <span className="text-[10px] text-muted-foreground tabular-nums">{s.mastery}%</span>
          </div>
        </div>
        <div className="h-1 w-16 rounded-full bg-muted overflow-hidden shrink-0">
          <div className="h-full rounded-full" style={{ width: `${s.mastery}%`, background: accent }} />
        </div>
        {!s.locked && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
    );
  };

  return (
    <Card className={"p-4 " + (row.locked ? "opacity-80" : "")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold truncate">{row.concept.label}</span>
            {row.locked && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
            {!row.locked && row.masteredCount > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" /> {row.masteredCount} mastered
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {row.situations.length} situation{row.situations.length === 1 ? "" : "s"} ·
            unlocked rung {row.unlockedRung}/5 · {row.attempted} attempted
            {row.locked && row.lockedByLabels.length > 0 && (
              <> · needs: {row.lockedByLabels.join(", ")}</>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {row.situations.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No situations tagged yet.</p>
          ) : (
            row.situations.map(renderSituation)
          )}
        </div>
      )}
    </Card>
  );
}

export function IqConceptLadder() {
  const { sport } = useSportTheme();
  const q = useIqConceptLadder(sport);

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }
  const rows = q.data ?? [];
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Mastery ladder
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Master rungs to unlock the next tier
        </span>
      </div>
      {rows.map((r) => <ConceptRow key={r.concept.id} row={r} />)}
    </div>
  );
}

export { RungPips };
