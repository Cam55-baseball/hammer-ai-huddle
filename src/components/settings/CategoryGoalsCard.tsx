/**
 * CategoryGoalsCard — Profile-anchored editor for the athlete's ranked
 * category goals. Reuses the same `CategoryGoalsStep` UX so the field
 * stays canonical end-to-end.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CategoryGoalsStep } from "@/components/onboarding/steps/CategoryGoalsStep";
import {
  CATEGORY_INTENTS,
  CATEGORY_LABELS,
  normalizeCategoryGoals,
  rankedCategories,
  intentFor,
  type CategoryGoalsPayload,
} from "@/lib/hammer/goals/categoryGoals";

export function CategoryGoalsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<CategoryGoalsPayload | null>(null);
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
      setPayload(normalizeCategoryGoals((data as { category_goals?: unknown } | null)?.category_goals));
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
        ) : payload ? (
          <ol className="space-y-1.5">
            {rankedCategories(payload).map((cat, i) => {
              const intentId = intentFor(payload, cat);
              const intentLabel = intentId
                ? CATEGORY_INTENTS[cat].find((p) => p.id === intentId)?.label
                : null;
              return (
                <li key={cat} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="font-mono">#{i + 1}</Badge>
                  <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  {intentLabel && (
                    <span className="text-xs text-muted-foreground">— {intentLabel}</span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">
            You haven't ranked your goals yet. Hammer falls back to a neutral plan
            until you do.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {payload ? "Edit ranking" : "Rank goals"}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rank your goals</DialogTitle>
          </DialogHeader>
          <CategoryGoalsStep
            onContinue={handleSaved}
            onBack={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
