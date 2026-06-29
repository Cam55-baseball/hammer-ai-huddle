import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Brain, Sparkles } from "lucide-react";
import { IqSituationCard } from "@/components/iq/IqSituationCard";
import { useIqSituations } from "@/hooks/useIqSituations";
import { useIqProgress } from "@/hooks/useIqProgress";
import { useSportTheme } from "@/contexts/SportThemeContext";
import type { IqLens } from "@/lib/iq/types";

export default function GameIqReview() {
  const navigate = useNavigate();
  const { sport } = useSportTheme();
  const [params] = useSearchParams();
  const lensParam = params.get("lens");
  const lens: IqLens | undefined =
    lensParam === "defense" || lensParam === "offense" || lensParam === "pitching" || lensParam === "baserunning"
      ? (lensParam as IqLens)
      : undefined;
  const sitQ = useIqSituations(sport, lens);
  const progQ = useIqProgress();

  const { due, suggested } = useMemo(() => {
    const now = Date.now();
    const progress = progQ.data ?? [];
    const dueIds = new Set(
      progress
        .filter((p) => p.next_due_at && new Date(p.next_due_at).getTime() <= now)
        .map((p) => p.situation_id),
    );
    const touchedIds = new Set(progress.map((p) => p.situation_id));
    const masteryById = new Map(progress.map((p) => [p.situation_id, p.mastery_score]));
    const sits = sitQ.data ?? [];
    const due = sits
      .filter((s) => dueIds.has(s.id))
      .map((s) => ({ s, m: masteryById.get(s.id) ?? 0 }));
    // Fallback for new users / empty queue: serve up to 4 untouched situations
    // so "Start reps" from the Hammer plan is never a dead end.
    const suggested = due.length === 0
      ? sits.filter((s) => !touchedIds.has(s.id)).slice(0, 4).map((s) => ({ s, m: 0 }))
      : [];
    return { due, suggested };
  }, [sitQ.data, progQ.data]);

  const items = due.length > 0 ? due : suggested;
  const mode: "due" | "suggested" | "empty" = due.length > 0 ? "due" : suggested.length > 0 ? "suggested" : "empty";

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-4 space-y-5">
        <Button variant="ghost" onClick={() => navigate("/iq")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">
              {mode === "suggested" ? "Start your IQ" : "Review queue"}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "suggested"
              ? "No reps due yet — here are situations to begin with. Mastery unlocks spaced repetition."
              : "Decayed situations resurface here. Knock them down to lock in mastery."}
          </p>
          {lens && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" /> Focused: {lens}
            </div>
          )}
        </div>

        {mode === "empty" ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nothing due and no published situations matched. Stay sharp — check back soon.
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map(({ s, m }) => (
              <IqSituationCard key={s.id} situation={s} mastery={m}
                               onClick={() => navigate(`/iq/${s.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
