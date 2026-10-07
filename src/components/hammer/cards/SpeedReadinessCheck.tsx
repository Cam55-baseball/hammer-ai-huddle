/**
 * Speed check-in — Round 8 Step 3a. One readiness score for today's speed work.
 * Screen-side only: shows how many of each prescribed sprint set to do and when to take
 * a break day. It never rewrites the saved plan.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useSpeedHistory } from "@/hooks/useSpeedHistory";
import { BAREFOOT_STAGES, barefootState, isPlateau, speedFocus, unlocks, breakDayReasons, cutReps, readinessScore, type BodyFeel, type SpeedCheckIn } from "@/lib/speed/speedEngine";

const SPOTS = ["Foot", "Ankle", "Shin", "Achilles", "Calf", "Hamstring", "Quad", "Hip", "Groin", "Back"];
const SLEEP = ["Awful", "Poor", "OK", "Good", "Great"];
const key = (d: string) => `hm_speed_checkin_${d}`;

export function useSpeedCheckIn(planDate: string) {
  const [c, setC] = useState<(SpeedCheckIn & { override?: boolean }) | null>(() => {
    try { return JSON.parse(localStorage.getItem(key(planDate)) ?? "null"); } catch { return null; }
  });
  useEffect(() => { if (c) localStorage.setItem(key(planDate), JSON.stringify(c)); }, [c, planDate]);
  return [c, setC] as const;
}

const LOWER = ["Foot", "Ankle", "Shin", "Achilles", "Calf", "Hamstring", "Quad", "Hip", "Groin"];
export function SpeedReadinessCheck({ planDate, sprintSets, inSeason }: { planDate: string; sprintSets: { name: string; sets: number }[]; inSeason?: boolean }) {
  const hist = useSpeedHistory(planDate);
  const { user } = useOptionalAuth();
  const [saved, setSaved] = useSpeedCheckIn(planDate);
  const [sleep, setSleep] = useState<number | null>(null);
  const [feel, setFeel] = useState<BodyFeel | null>(null);
  const [pain, setPain] = useState<string[]>([]);

  const submit = async () => {
    if (!sleep || !feel) return;
    const c: SpeedCheckIn = { sleep: sleep as SpeedCheckIn["sleep"], feel, painAreas: pain };
    setSaved(c);
    if (user?.id) {
      await supabase.from("wk_session_logs" as any).insert({
        user_id: user.id, plan_date: planDate, movement_slug: "speed_checkin",
        metrics: { kind: "speed_checkin", ...c, readiness: readinessScore(c) },
      } as any);
    }
  };

  if (!saved) {
    return (
      <div data-speed-checkin className="space-y-2 rounded-md border border-border p-2 text-xs">
        <p className="font-medium text-foreground">Quick check before you sprint</p>
        <div>
          <p className="mb-1 text-muted-foreground">How did you sleep?</p>
          <div className="flex flex-wrap gap-1">
            {SLEEP.map((l, i) => (
              <Button key={l} size="sm" variant={sleep === i + 1 ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setSleep(i + 1)}>{l}</Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-muted-foreground">How do your legs feel?</p>
          <div className="flex gap-1">
            {(["good", "okay", "tight"] as BodyFeel[]).map((f) => (
              <Button key={f} size="sm" variant={feel === f ? "default" : "outline"} className="h-7 px-2 text-[11px] capitalize" onClick={() => setFeel(f)}>{f}</Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-muted-foreground">Anything sore? (tap all that apply)</p>
          <div className="flex flex-wrap gap-1">
            {SPOTS.map((s) => (
              <Button key={s} size="sm" variant={pain.includes(s) ? "default" : "outline"} className="h-7 px-2 text-[11px]"
                onClick={() => setPain((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}>{s}</Button>
            ))}
          </div>
        </div>
        <Button size="sm" className="h-8 w-full" disabled={!sleep || !feel} onClick={submit}>See today's sprint count</Button>
      </div>
    );
  }

  const score = readinessScore(saved);
  const reasons = breakDayReasons(saved, hist.newestFirst, hist.bests);
  const focus = speedFocus({ lowerBodyInjury: false, highLoadOrLowReadiness: score < 40, inSeason });
  const sore = saved.painAreas.some((p) => LOWER.includes(p));
  const cap = (n: number) => { const c = cutReps(n, score); return focus.repCap ? Math.min(c, Math.max(1, focus.repCap)) : c; };
  const un = unlocks(hist.sessions.length);
  const plateau = isPlateau(hist.sessions);
  const breakDay = reasons.length > 0 && !saved.override;
  const todayPain = saved.painAreas.length ? [{ kind: "pain" as const, date: planDate, areas: saved.painAreas }] : [];
  const bf = barefootState([...hist.barefootEvents, ...todayPain], score);
  const saveRpe = async (n: number) => {
    setSaved({ ...saved, rpe: n } as any);
    if (user?.id) await supabase.from("wk_session_logs" as any).insert({
      user_id: user.id, plan_date: planDate, movement_slug: "speed_rpe", metrics: { kind: "speed_rpe", rpe: n },
    } as any);
  };
  const rpe = (saved as any).rpe as number | undefined;
  return (
    <div data-speed-readiness={score} className="space-y-1 rounded-md border border-border bg-muted/30 p-2 text-xs">
      <p className="font-medium text-foreground">Speed readiness: {score} out of 100</p>
      {breakDay ? (
        <>
          <p className="text-foreground">Break day suggested — skip the all-out sprints and do easy movement instead.</p>
          <ul className="list-disc pl-4 text-muted-foreground">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSaved({ ...saved, override: true })}>I feel fine — sprint anyway</Button>
        </>
      ) : sore ? (
        <p className="text-foreground">You marked a sore spot in your legs — run easy today, no all-out sprints. Stop if anything hurts.</p>
      ) : score >= 60 && !sprintSets.some((x) => cap(x.sets) < x.sets) ? (
        <p className="text-muted-foreground">Good to go — do every rep on the plan.</p>
      ) : (
        <>
          <p className="text-muted-foreground">{score < 60 ? "Your body needs a lighter day, so do fewer sprints:" : focus.label}</p>
          <ul className="pl-1 text-foreground">
            {sprintSets.map((s) => <li key={s.name}>{s.name}: {cap(s.sets)} of {s.sets} reps</li>)}
          </ul>
        </>
      )}
      <p className="text-muted-foreground">Today's focus: {focus.label}</p>
      <p data-barefoot-stage={bf.stage} className="text-muted-foreground">Barefoot level: {BAREFOOT_STAGES[bf.stage]}{bf.stage === 0 ? " — keep your shoes on for sprints." : "."}{bf.missing.length ? ` To move up: ${bf.missing.join(", ")}.` : ""} Any foot, ankle, shin, Achilles or calf pain drops you back one level.</p>
      <div data-speed-rpe className="pt-1">
        <p className="text-muted-foreground">After sprinting: how hard was it? (1 = very easy, 10 = all-out){rpe ? ` — you said ${rpe}` : ""}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Button key={n} size="sm" variant={rpe === n ? "default" : "outline"} className="h-7 w-7 p-0 text-[11px]" onClick={() => saveRpe(n)}>{n}</Button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground">Speed sessions so far: {hist.sessions.length}. {un.overspeed ? "Resisted and downhill sprints are unlocked." : un.resisted ? "Resisted sprints are unlocked; downhill sprints unlock at session 10." : "Resisted sprints unlock at session 7."}</p>
      {plateau && <p className="text-foreground">No new best in 4 sessions — that's normal. Focus on clean form and full rest; speed will come.</p>}
      {saved.painAreas.length > 0 && <p className="text-muted-foreground">Sore spots: {saved.painAreas.join(", ")}. Stop if anything hurts.</p>}
    </div>
  );
}
