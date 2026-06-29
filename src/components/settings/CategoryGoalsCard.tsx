/**
 * CategoryGoalsCard — Profile-anchored editor for the V2 ranked sub-goal model.
 * Reuses the same `CategoryGoalsStep` wizard in embedded mode so the field
 * stays canonical end-to-end (single source of truth, single UX surface).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
import { useSideContext } from "@/contexts/SideContext";
import { SideContextPicker } from "@/components/shared/SideContextPicker";
import {
  getV2,
  type CategoryGoalsPayloadV2,
  type DisciplineGoals,
  type SubGoalPick,
} from "@/lib/hammer/goals/categoryGoals";
import {
  findSubGoal,
  type Sport,
  type Discipline,
  type CategoryKey,
} from "@/lib/hammer/goals/subGoalCatalog";

const PANE_LABELS: Record<Sport, string> = { baseball: "Baseball", softball: "Softball" };
const DISCIPLINE_LABELS: Record<Discipline, string> = {
  position: "Position",
  pitcher: "Pitcher",
};

function renderPane(sport: Sport, discipline: Discipline, dg: DisciplineGoals) {
  const rows: { cat: CategoryKey; picks: ReadonlyArray<SubGoalPick> }[] = [];
  for (const cat of ["speed", "power", "hitting", "fielding", "throwing", "pitching"] as CategoryKey[]) {
    const picks = (dg[cat as keyof DisciplineGoals] as ReadonlyArray<SubGoalPick> | undefined) ?? [];
    if (picks.length) rows.push({ cat, picks });
  }
  if (!rows.length) return null;
  return (
    <div key={`${sport}:${discipline}`} className="rounded-md border border-border bg-muted/30 p-2.5">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {PANE_LABELS[sport]} · {DISCIPLINE_LABELS[discipline]}
      </div>
      <ul className="space-y-1">
        {rows.map(({ cat, picks }) => (
          <li key={cat} className="text-xs">
            <span className="font-medium capitalize">{cat}:</span>{" "}
            {picks.map((p, i) => {
              const sg = findSubGoal(sport, discipline, cat, p.id);
              return (
                <span key={p.id}>
                  {i > 0 && " · "}
                  <span className={p.rank === "primary" ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {sg?.label ?? p.id}
                  </span>
                  <span className="ml-0.5 text-[10px] text-muted-foreground">
                    ({p.rank === "primary" ? "70%" : "30%"})
                  </span>
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryGoalsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isSwitchHitter, isAmbidextrousThrower, selectedSide } = useSideContext();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<CategoryGoalsPayloadV2 | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("athlete_context")
        .select("category_goals")
        .eq("user_id", user.id)
        .maybeSingle();
      setPayload(getV2((data as { category_goals?: unknown } | null)?.category_goals));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSaved = () => {
    setOpen(false);
    load();
    qc.invalidateQueries({ queryKey: ["athlete-onboarding-state", user?.id] });
    qc.invalidateQueries({ queryKey: ["hammer-context-envelope", user?.id] });
  };

  const panes = payload
    ? ([
        ["baseball", "position", payload.baseball?.position],
        ["baseball", "pitcher", payload.baseball?.pitcher],
        ["softball", "position", payload.softball?.position],
        ["softball", "pitcher", payload.softball?.pitcher],
      ] as const).filter(([, , dg]) => !!dg)
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Ranked goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : panes.length > 0 ? (
          <div className="space-y-2">
            {panes.map(([s, d, dg]) =>
              renderPane(s as Sport, d as Discipline, dg as DisciplineGoals),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              You haven't picked any sub-goals yet. Hammer falls back to a neutral plan until you do.
            </p>
            <Badge variant="outline" className="text-[10px]">Edit anytime</Badge>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {panes.length > 0 ? "Edit goals" : "Set goals"}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your goals</DialogTitle>
          </DialogHeader>
          <CategoryGoalsStep
            onContinue={handleSaved}
            onBack={() => setOpen(false)}
            embedded
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
