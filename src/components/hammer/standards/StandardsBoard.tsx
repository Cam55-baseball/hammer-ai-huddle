/**
 * StandardsBoard — the athlete-facing trophy wall.
 *
 * Shows every weight-room standard grouped by family, with the tier currently
 * held, the next mark, and how close the athlete is to it. Purely a display
 * surface: nothing here changes a prescription.
 */
import { useMemo, useState } from "react";
import { ChevronDown, Lock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FAMILIES, STANDARDS_BW_CAP_LBS, STANDARDS_TARGET_DISCLAIMER, TIER_LABEL, type StandardFamily, type StandardTier } from "@/lib/hammer/standards/catalog";
import { useStandards } from "@/hooks/useStandards";
import type { StandardProgress } from "@/lib/hammer/standards/evaluate";

const TIER_STYLE: Record<StandardTier, string> = {
  standard: "bg-secondary text-secondary-foreground",
  elite: "bg-primary/15 text-primary border-primary/40",
  world_class: "bg-accent/20 text-accent-foreground border-accent",
};

function formatValue(p: StandardProgress): string {
  if (p.value === null) return "—";
  const v = Number.isInteger(p.value) ? p.value : Math.round(p.value * 10) / 10;
  return `${v} ${p.standard.unit}`;
}

function StandardRow({ p }: { p: StandardProgress }) {
  const [open, setOpen] = useState(false);
  const locked = !p.eligible;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{p.standard.name}</span>
              {p.achieved && (
                <Badge variant="outline" className={cn("gap-1 text-[10px]", TIER_STYLE[p.achieved])}>
                  <Trophy className="h-3 w-3" />
                  {TIER_LABEL[p.achieved]}
                </Badge>
              )}
              {p.closing && (
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  Closing in
                </Badge>
              )}
              {locked && (
                <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {p.reason === "age"
                    ? `Opens at ${p.standard.minAgeYears}`
                    : p.reason === "needs_bodyweight"
                      ? "Log bodyweight"
                      : "Build training age"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{p.standard.definition}</p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={Math.round(p.pctToNext * 100)} className="h-1.5 flex-1" />
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {formatValue(p)}
                {p.next && p.nextTarget !== null ? ` / ${p.nextTarget} ${p.standard.unit}` : " · held"}
              </span>
            </div>
          </div>
          <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-3 pb-3 pt-2 text-xs">
          <p className="text-muted-foreground">{p.standard.why}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["standard", "elite", "world_class"] as StandardTier[]).map((t) => (
              <div
                key={t}
                className={cn(
                  "rounded-md border p-2 text-center",
                  p.achieved && p.standard.targets[t] <= p.standard.targets[p.achieved]
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60",
                )}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{TIER_LABEL[t]}</div>
                <div className="text-sm font-semibold tabular-nums">
                  {p.standard.targets[t]}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">{p.standard.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
            Safety: {p.standard.safety}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StandardsBoard({ className }: { className?: string }) {
  const { progress, isLoading } = useStandards();

  const byFamily = useMemo(() => {
    const m = new Map<StandardFamily, StandardProgress[]>();
    for (const p of progress) {
      const list = m.get(p.standard.family) ?? [];
      list.push(p);
      m.set(p.standard.family, list);
    }
    return m;
  }, [progress]);

  const earned = progress.filter((p) => p.achieved).length;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading your standards…</CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-primary" />
          Standards Board
          <Badge variant="secondary" className="ml-auto text-[11px]">
            {earned} / {progress.length} marks held
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Marks you can earn from sets you already log. They never change your sets, reps or load —
          your plan still owns those. This is the ceiling we are building toward.{" "}
          {STANDARDS_TARGET_DISCLAIMER} Loaded marks are calculated at a bodyweight of{" "}
          {STANDARDS_BW_CAP_LBS} lb or your own, whichever is lower.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {FAMILIES.map((f) => {
          const rows = byFamily.get(f.id) ?? [];
          if (!rows.length) return null;
          return (
            <section key={f.id} className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold">{f.name}</h3>
                <p className="text-xs text-muted-foreground">{f.tagline}</p>
              </div>
              <div className="space-y-2">
                {rows.map((p) => (
                  <StandardRow key={p.standard.id} p={p} />
                ))}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default StandardsBoard;
