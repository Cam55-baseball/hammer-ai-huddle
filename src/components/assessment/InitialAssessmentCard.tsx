import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportInjuryDialog } from "@/components/hammer/ReportInjuryDialog";
import { S2CognitionDiagnostics } from "@/components/tex-vision/S2CognitionDiagnostics";
import { VaultPerformanceTestCard } from "@/components/vault/VaultPerformanceTestCard";
import { useVault } from "@/hooks/useVault";
import { AssessmentMode } from "./AssessmentMode";
import { AssessmentProfileReview } from "./AssessmentProfileReview";
import { parseSeasonStats, seasonStatGroups } from "@/lib/assessment/seasonStats";
import { assessmentAnalysisSaved } from "@/lib/assessment/analysisSaved";
import { saveBeforeAssessmentNavigation, type DraftFlush } from "@/lib/assessment/draftFlush";
import { assessmentModules, assessmentSteps, requiredAnalyses, shouldFinalizeAssessment, type AnalysisModule, type StepId, type StepProgress } from "@/lib/assessment/initialAssessment";
const EmbeddedAnalysis = lazy(() => import("@/pages/AnalyzeVideo"));
const MOVES = [
  { key: "hip", label: "Hip rotation (turn each hip in and out)" },
  { key: "shoulder", label: "Shoulder rotation (arm up at 90°, rotate back and forward)" },
  { key: "ankle", label: "Ankle (knee to wall, heel down)" },
  { key: "balance", label: "Single-leg balance (30 seconds each leg)" },
] as const;
type Answer = "easy" | "hard" | "pain";

export function InitialAssessmentCard({ sport, autoOpen = false, onClose }: { sport: "baseball" | "softball"; autoOpen?: boolean; onClose?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const vault = useVault();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<StepId>(1);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [profile, setProfile] = useState({ full_name: "", position: "" });
  const [stats, setStats] = useState<Record<string, string>>({});
  const [analysisModule, setAnalysisModule] = useState<AnalysisModule | null>(null);
  const [painOpen, setPainOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const finalizing = useRef(false);
  const profileFlush = useRef<DraftFlush | null>(null);
  const q = useQuery({
    queryKey: ["initial-assessment", user?.id, sport], enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Sign in first");
      const uid = user.id;
      const [row, s2, vids, tests, prof, subscription] = await Promise.all([
        supabase.from("initial_assessments").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("tex_vision_s2_diagnostics").select("user_id", { count: "exact", head: true }).eq("user_id", uid).eq("sport", sport).not("completed_at", "is", null),
        supabase.from("videos").select("module").eq("user_id", uid).eq("sport", sport).not("analysis_public", "is", null).limit(200),
        supabase.from("vault_performance_tests").select("user_id", { count: "exact", head: true }).eq("user_id", uid).eq("sport", sport),
        supabase.from("profiles").select("full_name,position,hammers_today_started_at,throwing_hand,batting_side,date_of_birth").eq("id", uid).maybeSingle(),
        supabase.from("subscriptions").select("status,subscribed_modules").eq("user_id", uid).eq("status", "active"),
      ]);
      for (const result of [row, s2, vids, tests, prof, subscription]) if (result.error) throw result.error;
      const modules = [...new Set((subscription.data ?? []).flatMap(sub => assessmentModules(sub, sport)))];
      return { row: row.data, s2: (s2.count ?? 0) > 0, analyses: [...new Set((vids.data ?? []).map(v => v.module))] as AnalysisModule[], tests: (tests.count ?? 0) > 0, profile: prof.data, modules };
    },
  });
  useEffect(() => {
    if (!q.data || hydrated.current) return;
    hydrated.current = true;
    setStep(Math.min(6, Math.max(1, q.data.row?.current_step ?? 1)) as StepId);
    setAnswers((q.data.row?.movement_screen ?? {}) as Record<string, Answer>);
    setProfile({ full_name: q.data.profile?.full_name ?? "", position: q.data.profile?.position ?? "" });
    const savedStats = q.data.row?.last_season_stats as Record<string, unknown> | null;
    setStats(Object.fromEntries(Object.entries(savedStats ?? {}).map(([k,v]) => [k, String(v)])));
  }, [q.data]);
  const save = async (patch: Record<string, unknown>) => {
    if (!user) return false;
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from("initial_assessments").upsert({ user_id: user.id, updated_at: new Date().toISOString(), ...patch });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["initial-assessment", user.id] });
      await qc.invalidateQueries({ queryKey: ["assessment-start", user.id] });
      return true;
    } catch {
      setSaveError("Couldn't save your assessment. Try again.");
      return false;
    } finally { setSaving(false); }
  };
  useEffect(() => {
    if (!autoOpen || !q.data || q.data.row?.completed_at || q.data.profile?.hammers_today_started_at) return;
    setOpen(true);
    if (!q.data.row?.mode_opened_at) void save({ mode_opened_at: new Date().toISOString() });
  }, [autoOpen, !!q.data]);
  const close = () => { setOpen(false); onClose?.(); };
  useEffect(() => {
    if (!q.data || saving || saveError || finalizing.current || q.data.profile?.hammers_today_started_at) return;
    const row = q.data.row;
    const input = { onboardingDone: false, lastSeasonDoneOrSkipped: !!(row?.last_season_saved_at || row?.last_season_skipped_at), movementScreenDone: !!row?.movement_done_at, s2Done: q.data.s2, analysesDone: q.data.analyses, sixWeekTestDone: q.data.tests, modules: q.data.modules, progress: (row?.step_progress ?? {}) as StepProgress };
    if (!shouldFinalizeAssessment(input, row?.completed_at)) return;
    finalizing.current = true;
    void save({ completed_at: new Date().toISOString() }).then(saved => {
      if (saved) close();
      else finalizing.current = false;
    });
  }, [q.data, saving, saveError]);
  if (!user) return null;
  if (q.error) return <p role="alert" className="text-sm text-destructive">Couldn't load your assessment. Reload and try again.</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Loading your assessment…</p>;
  if (q.data.row?.completed_at || q.data.profile?.hammers_today_started_at) return null;
  const data = q.data;
  const sportModules = data.modules;
  const need = requiredAnalyses(sportModules);
  const progress = (data.row?.step_progress ?? {}) as StepProgress;
  const input = { onboardingDone: false, lastSeasonDoneOrSkipped: !!(data.row?.last_season_saved_at || data.row?.last_season_skipped_at), movementScreenDone: !!data.row?.movement_done_at, s2Done: data.s2, analysesDone: data.analyses, sixWeekTestDone: data.tests, modules: sportModules, progress };
  const steps = assessmentSteps(input);
  const count = Object.values(steps).filter(s => s === "done").length;
  const enteredPatch = (): Record<string, unknown> | null => {
    const parsed = parseSeasonStats(stats);
    if (!parsed) { setSaveError("Use zero or a positive number, or leave the answer blank."); return null; }
    return { last_season_stats: parsed, movement_screen: answers, ...(Object.values(answers).includes("pain") ? { pain_flag: true } : {}) };
  };
  const navigateStep = (id: StepId) => {
    if (saving || steps[id] === "locked") return;
    const patch = enteredPatch();
    if (!patch) return;
    void (async () => {
      if (!await saveBeforeAssessmentNavigation(profileFlush.current, async () => {})) return;
      const { error } = await supabase.from("profiles").update({ full_name: profile.full_name || null, position: profile.position || null }).eq("id", user.id);
      if (error) { setSaveError("Couldn't save your profile. Try again."); return; }
      if (await save({ ...patch, current_step: id })) { setAnalysisModule(null); setStep(id); }
    })();
  };
  // Only a successful embedded submission (or explicit navigation action)
  // records these steps. Pre-existing results remain available, not completion.
  const embeddedSaved = async (id: 4 | 6) => {
    const saved = await save({ step_progress: { ...progress, [id]: "done" } });
    if (saved) await qc.invalidateQueries({ queryKey: ["initial-assessment", user.id] });
  };
  const record = async (state: "done" | "skipped") => {
    if (saving) return;
    if (!await saveBeforeAssessmentNavigation(profileFlush.current, async () => {})) return;
    const at = new Date().toISOString();
    const patch = enteredPatch();
    if (!patch) return;
    const seasonStats = parseSeasonStats(stats);
    if (state === "done" && step === 2 && !seasonStats) {
      setSaveError("Use zero or a positive number, or leave the answer blank.");
      return;
    }
    if (step === 1) {
      const { error } = await supabase.from("profiles").update({ full_name: profile.full_name || null, position: profile.position || null }).eq("id", user.id);
      if (error) { setSaveError("Couldn't save your profile. Try again."); return; }
    }
    if (step === 2) {
      if (state === "skipped") patch.last_season_skipped_at = at;
      else { patch.last_season_saved_at = at; patch.last_season_stats = seasonStats; }
    }
    const anyPain = MOVES.some(m => answers[m.key] === "pain");
    if (step === 3 && anyPain) patch.pain_flag = true;
    if (step === 3 && state === "done") {
      // Missing answers are not evidence of a painless screen. The athlete
      // may still explicitly skip; only actual answers populate safety data.
      Object.assign(patch, { movement_screen: answers, ...(MOVES.every(m => answers[m.key]) ? { movement_done_at: at } : {}), ...(anyPain ? { pain_flag: true } : {}) });
    }
    const updated = { ...progress, [step]: state };
    const after = assessmentSteps({ ...input, progress: updated });
    const finished = Object.values(after).every(s => s === "done");
    const next = Math.min(6, step + 1) as StepId;
    const saved = await save({ ...patch, step_progress: updated, current_step: next, ...(finished ? { completed_at: at } : {}) });
    if (!saved) return;
    if (step === 3 && anyPain) setPainOpen(true);
    if (finished || step === 6) close(); else { setStep(next); setAnalysisModule(null); }
  };
  return <>
    <Card className="flex flex-wrap items-center gap-4 border-primary/30 p-4">
      <ClipboardCheck className="h-6 w-6 shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><h3 className="font-semibold">Initial assessment · {count} of 6 done</h3><p className="text-sm text-muted-foreground">Your plan unlocks when you finish or skip all six steps.</p></div>
      <Button onClick={() => setOpen(true)}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
    </Card>
    <AssessmentMode open={open} onClose={close} step={step} steps={steps} busy={saving} error={saveError} onNavigate={navigateStep} onRecord={state => { void record(state); }}>
      {step === 1 && <AssessmentProfileReview profile={profile} onChange={setProfile} registerFlush={flush => { profileFlush.current = flush; }} />}
      {step === 2 && <div className="space-y-5"><p className="text-sm text-muted-foreground">Player-reported · last season. Leave anything you don't know blank.</p>{seasonStatGroups(sport, sportModules).map(group => <section key={group.category} className="space-y-4 border-t border-border pt-4"><h3 className="font-semibold">{group.category}</h3>{group.category === "Fielding" && <label className="block space-y-2">Positions played<Input value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })} /></label>}{group.fields.map(({key,label}) => <div key={key} className="space-y-2"><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} type="number" min="0" step="any" value={stats[key] ?? ""} onChange={e => setStats({ ...stats, [key]: e.target.value })} /></div>)}</section>)}</div>}
      {step === 3 && <div className="space-y-6"><p className="text-sm text-muted-foreground">Move slowly. Stop if it hurts.</p>{MOVES.map(m => <div key={m.key} className="space-y-3"><p className="font-medium">{m.label}</p><div className="flex flex-wrap gap-2">{(["easy", "hard", "pain"] as Answer[]).map(a => <Button key={a} variant={answers[m.key] === a ? "default" : "outline"} onClick={() => { setAnswers({ ...answers, [m.key]: a }); if (a === "pain") setPainOpen(true); }}>{a === "easy" ? "Easy" : a === "hard" ? "Hard / tight" : "It hurt"}</Button>)}</div></div>)}</div>}
      {step === 4 && <S2CognitionDiagnostics sport={sport} embedded onSaved={() => { void embeddedSaved(4); }} />}
      {step === 5 && <div className="space-y-5"><div className="flex flex-wrap gap-3">{need.map(module => <Button key={module} variant={analysisModule === module ? "default" : "outline"} onClick={() => setAnalysisModule(module)}>Record {module}</Button>)}</div>{!need.length && <p className="text-sm text-muted-foreground">No analysis modules are included in this sport's subscription.</p>}{analysisModule && <Suspense fallback={<p>Opening your analysis…</p>}><EmbeddedAnalysis key={`${sport}-${analysisModule}`} assessment={{ module: analysisModule, sport, onSaved: report => { if (assessmentAnalysisSaved(report)) void qc.invalidateQueries({ queryKey: ["initial-assessment", user.id] }); }, onDone: () => { setAnalysisModule(null); void qc.invalidateQueries({ queryKey: ["initial-assessment", user.id] }); } }} /></Suspense>}</div>}
      {step === 6 && <VaultPerformanceTestCard tests={vault.performanceTests.filter(t => t.sport === sport)} subscribedModules={need} allowedModules={need} sport={sport} userProfile={{ throwing_hand: data.profile?.throwing_hand ?? undefined, batting_side: data.profile?.batting_side ?? undefined, primary_position: data.profile?.position ?? undefined, date_of_birth: data.profile?.date_of_birth ?? undefined }} autoOpen onSave={async (type, results, sides) => { const result = await vault.savePerformanceTest(type, results, sides, sport); if (result.success) await embeddedSaved(6); return result; }} />}
    </AssessmentMode>
    <ReportInjuryDialog assessment open={painOpen} onOpenChange={setPainOpen} />
  </>;
}
