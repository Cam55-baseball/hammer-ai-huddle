import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { saveStartingPoint, useInvalidateStartingPoint, useStartingPointAnswers } from "@/hooks/useStartingPoint";
import { rebuildAfterChange } from "@/lib/hammer/rebuildAfterChange";
import { getLocalDateString } from "@/utils/dateUtils";
import { usePitcherSchedule } from "@/hooks/usePitcherSchedule";
import { PitcherRoleQuestions } from "@/components/hammer/pitching/PitcherRoleQuestions";
import {
  answersComplete, golden2wayRoleMissing, programOf, questionsFor, type Answers, type Sport,
} from "../../../supabase/functions/_shared/wic/progression/startingPoint";

const TITLES: Record<string, string> = {
  overall: "Training", throwing: "Throwing", pitching: "Pitching", hitting: "Hitting", defense: "Defense",
  speed: "Sprints and running", lifting: "Lifting", jumps: "Jumps", bunting: "Bunting",
};

/** "Where are you starting from?" — owner-approved multiple choice, by program and sport. */
export function StartingPointForm({ onSaved, rebuild = true, compact = false }: { onSaved?: (message: string) => void; rebuild?: boolean; compact?: boolean }) {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const ctx = useHammerAthleteContext();
  const sport: Sport = String(ctx.get<string>("sport_primary")?.value ?? "baseball").toLowerCase() === "softball" ? "softball" : "baseball";
  const program = programOf(sport, modules);
  const saved = useStartingPointAnswers(user?.id, sport);
  const invalidate = useInvalidateStartingPoint();
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (saved.data?.answers) setAnswers(saved.data.answers); }, [saved.data]);
  const questions = useMemo(() => (program ? questionsFor(sport, program) : []), [sport, program]);
  const pitcher = usePitcherSchedule();
  const roleMissing = golden2wayRoleMissing(sport, modules ?? [], pitcher.data?.settings?.primary_focus ?? null);

  if (!program) return <p className="text-sm text-muted-foreground">These questions open once you have a training program for {sport}.</p>;
  if (saved.isLoading) return <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading your answers" />;
  if (saved.isError) return <p role="alert" className="text-sm text-destructive">Your answers could not be loaded. Try again.</p>;

  const complete = answersComplete(sport, program, answers) && !roleMissing;
  let lastCat = "";
  const save = async () => {
    if (!user?.id || !complete) return;
    setBusy(true); setErr(null); setMsg(null);
    const e = await saveStartingPoint(user.id, sport, program, answers);
    if (e) { setErr(e); setBusy(false); return; }
    await invalidate(user.id, sport);
    let message = "Saved. Your starting levels are set.";
    if (rebuild) message = (await rebuildAfterChange("Your starting point", getLocalDateString(new Date()))).message;
    setBusy(false); setMsg(message); onSaved?.(message);
  };

  return <div className="space-y-4" data-testid="starting-point-form">
    {!compact && <p className="text-sm text-muted-foreground">Pick the answer closest to you right now. Hammer starts you there and steps you up when you're ready.</p>}
    {program === "golden2way" && <fieldset className="space-y-2"><h4 className="pt-2 text-sm font-semibold">Your main role</h4><PitcherRoleQuestions compact />{roleMissing && <p className="text-xs text-muted-foreground">Pick one so Hammer can build your plan.</p>}</fieldset>}
    {questions.map((q) => {
      const head = q.category !== lastCat ? TITLES[q.category] : null; lastCat = q.category;
      return <fieldset key={q.id} className="space-y-2">
        {head && <h4 className="pt-2 text-sm font-semibold">{head}</h4>}
        <legend className="text-sm">{q.label}</legend>
        <div className="flex flex-wrap gap-2">{q.options.map((o) => {
          const on = answers[q.id] === o;
          return <Button key={o} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} data-testid={`sp-${q.id}-${o}`} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}>{o}</Button>;
        })}</div>
      </fieldset>;
    })}
    {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    {msg && <p role="status" className="rounded-md border border-primary/30 bg-primary/10 p-2 text-sm">{msg}</p>}
    <Button className="w-full" disabled={!complete || busy} onClick={() => void save()} data-testid="sp-save">
      {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{complete ? "Save my starting point" : "Answer every question to save"}
    </Button>
  </div>;
}

/** One-time Today card for existing players with no answers; disappears for good once saved. */
export function StartingPointPromptCard() {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const ctx = useHammerAthleteContext();
  const sport: Sport = String(ctx.get<string>("sport_primary")?.value ?? "baseball").toLowerCase() === "softball" ? "softball" : "baseball";
  const saved = useStartingPointAnswers(user?.id, sport);
  const [open, setOpen] = useState(false);
  const program = programOf(sport, modules);
  if (!user || !program || saved.isLoading || saved.isError || saved.data) return null;
  return <Card data-testid="starting-point-card">
    <CardHeader className="pb-2"><CardTitle className="text-base">Where are you starting from?</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">A few quick taps so Hammer starts you at the right level. You only answer once — change it any time in Profile.</p>
      {open ? <StartingPointForm compact /> : <Button className="w-full" onClick={() => setOpen(true)}>Answer now</Button>}
    </CardContent>
  </Card>;
}

/** Owner Nov 1 round 5: Golden 2Way players with no main role see this on Today until they pick. */
export function Golden2WayRolePromptCard() {
  const { modules } = useSubscription();
  const ctx = useHammerAthleteContext();
  const sport: Sport = String(ctx.get<string>("sport_primary")?.value ?? "baseball").toLowerCase() === "softball" ? "softball" : "baseball";
  const pitcher = usePitcherSchedule();
  if (pitcher.isLoading || pitcher.isError || !golden2wayRoleMissing(sport, modules ?? [], pitcher.data?.settings?.primary_focus ?? null)) return null;
  return <Card data-testid="golden2way-role-card">
    <CardHeader className="pb-2"><CardTitle className="text-base">Pitcher or position player?</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Golden 2Way needs your main role before Hammer can build your plan. You can switch any time.</p>
      <PitcherRoleQuestions compact />
    </CardContent>
  </Card>;
}

/** Profile card: view and edit the saved answers. */
export function StartingPointProfileCard() {
  const [open, setOpen] = useState(false);
  return <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">Where you're starting from</CardTitle></CardHeader>
    <CardContent>{open ? <StartingPointForm /> : <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>View or change my answers</Button>}</CardContent>
  </Card>;
}
