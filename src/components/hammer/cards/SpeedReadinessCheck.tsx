/**
 * Speed check-in — Round 8 Step 3a. One readiness score for today's speed work.
 * Screen-side only: shows how many of each prescribed sprint set to do and when to take
 * a break day. It never rewrites the saved plan.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { breakDayReasons, cutReps, readinessScore, type BodyFeel, type SpeedCheckIn } from "@/lib/speed/speedEngine";

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

export function SpeedReadinessCheck({ planDate, sprintSets }: { planDate: string; sprintSets: { name: string; sets: number }[] }) {
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
  const reasons = breakDayReasons(saved, [], {});
  const breakDay = reasons.length > 0 && !saved.override;
  return (
    <div data-speed-readiness={score} className="space-y-1 rounded-md border border-border bg-muted/30 p-2 text-xs">
      <p className="font-medium text-foreground">Speed readiness: {score} out of 100</p>
      {breakDay ? (
        <>
          <p className="text-foreground">Break day suggested — skip the all-out sprints and do easy movement instead.</p>
          <ul className="list-disc pl-4 text-muted-foreground">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSaved({ ...saved, override: true })}>I feel fine — sprint anyway</Button>
        </>
      ) : score >= 60 ? (
        <p className="text-muted-foreground">Good to go — do every rep on the plan.</p>
      ) : (
        <>
          <p className="text-muted-foreground">Your body needs a lighter day, so do fewer sprints:</p>
          <ul className="pl-1 text-foreground">
            {sprintSets.map((s) => <li key={s.name}>{s.name}: {cutReps(s.sets, score)} of {s.sets} reps</li>)}
          </ul>
        </>
      )}
      {saved.painAreas.length > 0 && <p className="text-muted-foreground">Sore spots: {saved.painAreas.join(", ")}. Stop if anything hurts.</p>}
    </div>
  );
}
