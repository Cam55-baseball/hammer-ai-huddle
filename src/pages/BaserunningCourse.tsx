import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Brain, Check, Lightbulb, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScenarioBlock } from "@/components/baserunning-iq/ScenarioBlock";
import { buildCourse, nextStepIndex, COURSE_STEPS } from "@/lib/baserunning/courseSteps";

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Owner Nov 4 r3 Part C: Baserunning IQ — a guided mental course, one step at a time. */
export default function BaserunningCourse() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const sport = localStorage.getItem("selectedSport") === "softball" ? "softball" : "baseball";
  const [open, setOpen] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);

  const content = useQuery({
    queryKey: ["baserunning-course-content", sport],
    queryFn: async () => {
      const [l, s] = await Promise.all([
        supabase.from("baserunning_lessons").select("id,title,elite_cue,game_transfer,order_index").or(`sport.eq.${sport},sport.eq.both`),
        supabase.from("baserunning_scenarios").select("*").or(`sport.eq.${sport},sport.eq.both`),
      ]);
      if (l.error) throw l.error;
      if (s.error) throw s.error;
      return { lessons: l.data ?? [], scenarios: s.data ?? [] };
    },
  });
  const progress = useQuery({
    queryKey: ["baserunning-course-progress", user?.id, sport],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("baserunning_course_progress").select("step_key,score,total").eq("user_id", user!.id).eq("sport", sport);
      if (error) throw error;
      return data ?? [];
    },
  });

  const steps = useMemo(() => content.data ? buildCourse(content.data.lessons, content.data.scenarios) : [], [content.data]);
  const done = useMemo(() => new Set((progress.data ?? []).map((p) => p.step_key)), [progress.data]);
  const current = open ?? nextStepIndex(done);
  const step = steps[current];

  const finishStep = async (score: number) => {
    if (!user || !step) return;
    setSaveError(null);
    const { error: e1 } = await supabase.from("baserunning_course_progress")
      .upsert({ user_id: user.id, sport, step_key: step.key, score, total: step.checks.length, completed_at: new Date().toISOString() }, { onConflict: "user_id,sport,step_key" });
    // Completing a step is today's Mind item; it counts in Discipline. One Mind log per day.
    const { error: e2 } = await supabase.from("mind_item_logs")
      .upsert({ user_id: user.id, item_date: localDate(), kind: "baserunning_iq" }, { onConflict: "user_id,item_date", ignoreDuplicates: true });
    if (e1 || e2) { setSaveError("That didn't save. Tap Finish step again."); return; }
    setJustDone(step.key);
    await qc.invalidateQueries({ queryKey: ["baserunning-course-progress"] });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-5 py-4">
        <Button variant="ghost" className="-ml-2 gap-1" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><Brain className="h-7 w-7 text-primary" aria-hidden /><h1 className="text-3xl font-bold">Baserunning IQ</h1></div>
          <p className="text-muted-foreground">Mental work only. Learn each part of baserunning, then answer a few quick game spots.</p>
          <div className="flex items-center gap-3"><Progress value={(done.size / COURSE_STEPS.length) * 100} className="h-2" aria-label="Course progress" /><span className="text-sm text-muted-foreground whitespace-nowrap">{done.size} of {COURSE_STEPS.length} steps</span></div>
        </div>

        {content.isLoading ? <Skeleton className="h-40 w-full" /> : content.error ? (
          <p role="alert" className="text-sm text-destructive">The course didn't load. Pull down to try again.</p>
        ) : (
          <>
            <ol className="flex flex-wrap gap-2" aria-label="Course steps">
              {steps.map((s, i) => (
                <li key={s.key}>
                  <Button size="sm" variant={i === current ? "default" : "outline"} onClick={() => { setOpen(i); setJustDone(null); }} aria-current={i === current ? "step" : undefined}>
                    {done.has(s.key) && <Check className="mr-1 h-3.5 w-3.5" aria-hidden />}{i + 1}. {s.title}
                  </Button>
                </li>
              ))}
            </ol>

            {step && (
              <Card className="space-y-4 p-5" aria-label={`Step ${current + 1}: ${step.title}`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {current + 1} of {steps.length}</p>
                  <h2 className="text-2xl font-bold">{step.title}</h2>
                  <p className="text-muted-foreground">{step.goal}</p>
                </div>
                {step.lessons.slice(0, 3).map((l) => (
                  <div key={l.id} className="space-y-2 rounded-md border p-3">
                    <p className="font-semibold">{l.title}</p>
                    {l.elite_cue && <p className="flex gap-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{l.elite_cue}</p>}
                    {l.game_transfer && <p className="flex gap-2 text-sm text-muted-foreground"><Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{l.game_transfer}</p>}
                  </div>
                ))}
                {justDone === step.key ? (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1 font-medium text-primary"><Check className="h-4 w-4" aria-hidden /> Step done. Today's Mind item is done and counts toward Discipline.</p>
                    {current < steps.length - 1 && <Button onClick={() => { setOpen(current + 1); setJustDone(null); }}>Next step: {steps[current + 1].title}</Button>}
                  </div>
                ) : step.checks.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Quick check: {step.checks.length} game spots</p>
                    <ScenarioBlock key={`${step.key}-${current}`}
                      scenarios={step.checks.map((s: any) => ({ ...s, options: s.options || [], answer_options: s.answer_options || null, correct_answer_id: s.correct_answer_id || null }))}
                      onComplete={(score) => void finishStep(score)} />
                  </div>
                ) : (
                  <Button onClick={() => void finishStep(0)}>Finish step</Button>
                )}
                {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
