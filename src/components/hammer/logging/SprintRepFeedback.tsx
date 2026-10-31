import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { judgeReps, conditioningRules, CONDITIONING_RULES_KEY, SESSION_YARD_CAP, type RepFeedback, type Feel } from "../../../../supabase/functions/_shared/wic/conditioning/yards";

const db = supabase as any;
export type RepOutcome = { stopped: string | null; offer: number | null };

/** Owner Oct 31: one-tap feedback after each sprint/conditioning rep, then smart stop or "add 2 more". */
export function SprintRepFeedback({ userId, prescriptionId, planDate, row, kind, repFeet, prescribedReps, seconds, extraUsed, onSaved, onStop, onAddMore }: {
  userId?: string; prescriptionId: string; planDate: string; row: number; kind: "max_sprint" | "repeat_sprint"; repFeet: number; prescribedReps: number;
  seconds: number | null; extraUsed: number; onSaved: (row: number) => void; onStop: (message: string) => void; onAddMore: (reps: number) => void;
}) {
  const rules = useQuery({ queryKey: ["conditioning-rules"], queryFn: async () => { const r = await db.from("app_settings").select("setting_value").eq("setting_key", CONDITIONING_RULES_KEY).maybeSingle(); return conditioningRules(r.data?.setting_value); } });
  const saved = useQuery({ queryKey: ["rep-feedback", prescriptionId], enabled: !!userId, queryFn: async () => {
    const r = await db.from("conditioning_rep_feedback").select("rep_index, seconds, feel, effort, pain, verdict").eq("prescription_id", prescriptionId).order("rep_index");
    if (r.error) throw r.error; return (r.data ?? []) as any[];
  } });
  const [feel, setFeel] = useState<Feel | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [pain, setPain] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [offer, setOffer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setFeel(null); setEffort(null); setPain(null); }, [row]);
  const history: RepFeedback[] = (saved.data ?? []).filter(r => r.rep_index < row).map(r => ({ seconds: r.seconds != null ? Number(r.seconds) : null, feel: r.feel, effort: r.effort, pain: r.pain }));
  const stoppedRow = (saved.data ?? []).find(r => String(r.verdict ?? "").startsWith("stop_"));
  const already = (saved.data ?? []).some(r => r.rep_index === row);
  useEffect(() => { if (already) onSaved(row); }, [already, row]);
  const yd = Math.round(repFeet / 3);
  const total = (prescribedReps + extraUsed) * yd;

  async function submit() {
    if (!userId || pain == null || busy) return;
    setBusy(true); setMsg(null);
    const rep: RepFeedback = { seconds, feel, effort, pain };
    const verdict = judgeReps([...history, rep], { kind, prescribedReps, repFeet, extraUsed }, rules.data?.stop);
    const code = verdict.action === "stop" ? `stop_${verdict.reason}` : verdict.action;
    const r = await db.from("conditioning_rep_feedback").upsert({ user_id: userId, plan_date: planDate, prescription_id: prescriptionId, rep_index: row, seconds: seconds && seconds > 0 ? Math.round(seconds * 100) / 100 : null, feel, effort, pain, verdict: code }, { onConflict: "prescription_id,rep_index" });
    setBusy(false);
    if (r.error) { setMsg("Couldn't save your rep. Try again."); return; }
    await saved.refetch();
    onSaved(row);
    if (verdict.action === "stop") { setMsg(verdict.message); onStop(verdict.message); }
    else if (verdict.action === "offer_more") setOffer(verdict.reps);
  }

  if (stoppedRow) return <div role="status" data-smart-stop className="rounded-md border border-border bg-muted/40 p-2 text-sm">
    <p className="font-medium">{stoppedRow.verdict === "stop_pain" ? "Stopped: you felt pain or tightness. It's logged for your check-in." : stoppedRow.verdict === "stop_effort_high" ? "Stopped early: effort stayed very high — smart stop" : "Stopped early: your speed dropped — smart stop"}</p>
    <p className="text-xs text-muted-foreground">This counts as done, not missed.</p>
  </div>;
  return <div data-rep-feedback className="space-y-2 rounded-md border border-border p-2">
    <p className="text-xs text-muted-foreground">Today: {prescribedReps + extraUsed} reps × {yd} yd = {total} yd (max {SESSION_YARD_CAP} yd).</p>
    {!already && <>
      <p className="text-sm font-medium">Rep {row + 1}: how did it go?{seconds ? ` Time ${seconds.toFixed(2)} s.` : ""}</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Feel">{(["fast", "same", "slower"] as const).map(f => <Button key={f} size="sm" type="button" variant={feel === f ? "default" : "outline"} aria-pressed={feel === f} onClick={() => setFeel(f)}>{f === "fast" ? "Fast" : f === "same" ? "Same" : "Slower"}</Button>)}</div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Effort 1 to 10">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <Button key={n} size="sm" type="button" className="h-8 w-8 p-0" variant={effort === n ? "default" : "outline"} aria-pressed={effort === n} onClick={() => setEffort(n)}>{n}</Button>)}</div>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Any pain or tightness?"><span className="text-sm">Any pain or tightness?</span>
        <Button size="sm" type="button" variant={pain === false ? "default" : "outline"} aria-pressed={pain === false} onClick={() => setPain(false)}>No</Button>
        <Button size="sm" type="button" variant={pain === true ? "destructive" : "outline"} aria-pressed={pain === true} onClick={() => setPain(true)}>Yes</Button></div>
      <Button size="sm" type="button" disabled={pain == null || busy || !userId} onClick={() => void submit()}>Save rep</Button>
    </>}
    {offer && <div className="flex flex-wrap items-center gap-2"><span className="text-sm">You're still fast. Add {offer} more reps?</span><Button size="sm" type="button" onClick={() => { onAddMore(offer); setOffer(null); }}>Add {offer} more reps</Button><Button size="sm" type="button" variant="outline" onClick={() => setOffer(null)}>I'm done</Button></div>}
    {msg && <p role="alert" className="text-sm">{msg}</p>}
  </div>;
}
