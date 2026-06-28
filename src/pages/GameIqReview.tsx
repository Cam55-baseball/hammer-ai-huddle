import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";
import { IqSituationCard } from "@/components/iq/IqSituationCard";
import { useIqSituations } from "@/hooks/useIqSituations";
import { useIqProgress } from "@/hooks/useIqProgress";
import { useSportTheme } from "@/contexts/SportThemeContext";

export default function GameIqReview() {
  const navigate = useNavigate();
  const { sport } = useSportTheme();
  const sitQ = useIqSituations(sport);
  const progQ = useIqProgress();

  const due = useMemo(() => {
    const now = Date.now();
    const dueIds = new Set(
      (progQ.data ?? [])
        .filter((p) => p.next_due_at && new Date(p.next_due_at).getTime() <= now)
        .map((p) => p.situation_id),
    );
    const masteryById = new Map((progQ.data ?? []).map((p) => [p.situation_id, p.mastery_score]));
    return (sitQ.data ?? [])
      .filter((s) => dueIds.has(s.id))
      .map((s) => ({ s, m: masteryById.get(s.id) ?? 0 }));
  }, [sitQ.data, progQ.data]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-4 space-y-5">
        <Button variant="ghost" onClick={() => navigate("/iq")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Review queue</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Decayed situations resurface here. Knock them down to lock in mastery.</p>
        </div>

        {due.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nothing due. Stay sharp — check back tomorrow.
          </Card>
        ) : (
          <div className="space-y-3">
            {due.map(({ s, m }) => (
              <IqSituationCard key={s.id} situation={s} mastery={m}
                               onClick={() => navigate(`/iq/${s.slug}`)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
