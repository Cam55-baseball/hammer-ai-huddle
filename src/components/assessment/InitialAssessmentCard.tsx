/**
 * Plan 4 §B — "Initial assessment" checklist. Shows in Before you start
 * until every step is done. Reads only real saved records; nothing inferred.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportInjuryDialog } from "@/components/hammer/ReportInjuryDialog";
import {
  STEP_LABELS, assessmentSteps, requiredAnalyses, type AnalysisModule, type StepId,
} from "@/lib/assessment/initialAssessment";

const MOVES = [
  { key: "hip", label: "Hip rotation (turn each hip in and out)" },
  { key: "shoulder", label: "Shoulder rotation (arm up at 90°, rotate back and forward)" },
  { key: "ankle", label: "Ankle (knee to wall, heel down)" },
  { key: "balance", label: "Single-leg balance (30 seconds each leg)" },
] as const;
type Answer = "easy" | "hard" | "pain";

export function InitialAssessmentCard({ sport }: { sport: "baseball" | "softball" }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { modules, initialized } = useSubscription();
  const { hasCompletedOnboarding, loading } = useAthleteOnboardingState();
  const [screenOpen, setScreenOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [painOpen, setPainOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["initial-assessment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [row, s2, vids, tests] = await Promise.all([
        supabase.from("initial_assessments").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("tex_vision_s2_diagnostics").select("user_id", { count: "exact", head: true }).eq("user_id", uid).not("completed_at", "is", null),
        supabase.from("videos").select("module").eq("user_id", uid).not("ai_analysis", "is", null).limit(200),
        supabase.from("vault_performance_tests").select("user_id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      return {
        row: row.data,
        s2: (s2.count ?? 0) > 0,
        analyses: [...new Set((vids.data ?? []).map((v: any) => String(v.module)))] as AnalysisModule[],
        tests: (tests.count ?? 0) > 0,
      };
    },
  });

  if (!user || !data || !initialized || loading || data.row?.completed_at) return null;

  const sportModules = modules.filter((m) => m.startsWith(sport));
  const input = {
    onboardingDone: hasCompletedOnboarding,
    lastSeasonDoneOrSkipped: !!(data.row?.last_season_saved_at || data.row?.last_season_skipped_at),
    movementScreenDone: !!data.row?.movement_done_at,
    s2Done: data.s2,
    analysesDone: data.analyses,
    sixWeekTestDone: data.tests,
    modules: sportModules,
  };
  const steps = assessmentSteps(input);
  const need = requiredAnalyses(sportModules);
  const allDone = Object.values(steps).every((s) => s === "done");

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    await supabase.from("initial_assessments").upsert({ user_id: user.id, updated_at: new Date().toISOString(), ...patch });
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["initial-assessment", user.id] });
  };
  if (allDone) { void save({ completed_at: new Date().toISOString() }); return null; }

  const action = (id: StepId) => {
    switch (id) {
      case 1: return <Button size="sm" onClick={() => nav("/onboarding/flow")}>Finish profile</Button>;
      case 2: return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => nav("/vault")}>Add stats</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ last_season_skipped_at: new Date().toISOString() })}>Skip</Button>
        </div>
      );
      case 3: return <Button size="sm" onClick={() => setScreenOpen(true)}>Start check</Button>;
      case 4: return <Button size="sm" onClick={() => nav("/tex-vision")}>Open Tex Vision</Button>;
      case 5: {
        const next = need.find((m) => !data.analyses.includes(m));
        return next ? <Button size="sm" onClick={() => nav(`/analyze/${next}`)}>Record {next}</Button> : null;
      }
      case 6: return <Button size="sm" onClick={() => nav("/vault")}>Open 6-week test</Button>;
    }
  };

  const screenReady = MOVES.every((m) => answers[m.key]);
  const anyPain = MOVES.some((m) => answers[m.key] === "pain");

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold">Initial assessment</h3>
        <p className="text-sm text-muted-foreground">Do steps 1, 2 and 3 in order. Then do 4, 5 and 6 in any order.</p>
      </div>
      <ol className="space-y-2">
        {([1, 2, 3, 4, 5, 6] as StepId[]).map((id) => (
          <li key={id} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm">
              {steps[id] === "done" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : steps[id] === "locked" ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4" />}
              <span>Step {id}: {STEP_LABELS[id]}{id === 5 && need.length ? ` (${need.join(", ")})` : ""}</span>
            </span>
            {steps[id] === "open" && action(id)}
            {steps[id] === "locked" && <span className="text-xs text-muted-foreground">Locked</span>}
          </li>
        ))}
      </ol>

      {screenOpen && (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm">Do each move slowly. Stop if it hurts.</p>
          {MOVES.map((m) => (
            <div key={m.key} className="space-y-1">
              <p className="text-sm font-medium">{m.label}</p>
              <div className="flex gap-2">
                {(["easy", "hard", "pain"] as Answer[]).map((a) => (
                  <Button key={a} size="sm" variant={answers[m.key] === a ? "default" : "outline"} onClick={() => setAnswers({ ...answers, [m.key]: a })}>
                    {a === "easy" ? "Easy" : a === "hard" ? "Hard / tight" : "It hurt"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {anyPain && <p className="text-sm text-destructive">You said something hurt. Please report it so your plan stays safe.</p>}
          <Button disabled={!screenReady || saving} onClick={async () => {
            await save({ movement_screen: answers, movement_done_at: new Date().toISOString(), pain_flag: anyPain });
            setScreenOpen(false);
            if (anyPain) setPainOpen(true);
          }}>Save check</Button>
        </div>
      )}
      <ReportInjuryDialog open={painOpen} onOpenChange={setPainOpen} />
    </Card>
  );
}
