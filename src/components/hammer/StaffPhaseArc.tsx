// v1.2 §C — the owner's staff view shows the day count and phase lengths.
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function StaffPhaseArc({ userId }: { userId: string }) {
  const [plan, setPlan] = useState<any>(null);
  useEffect(() => {
    let live = true;
    supabase.from("adaptive_phase_shadow").select("plan").eq("user_id", userId).order("plan_date", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (live) setPlan((data as any)?.plan ?? null); });
    return () => { live = false; };
  }, [userId]);
  if (!plan) return null;
  const segs: any[] = (plan.segments ?? []).filter((s: any) => s.weeks > 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Phase plan (shadow)</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-xs">
        <p>{plan.phaseName} · {plan.mode}{plan.arc ? ` · ${plan.arc.days} days · ${plan.arc.tier}` : ""}</p>
        {segs.map((s, i) => (
          <p key={i} className="text-muted-foreground">
            {s.block ?? s.phase}: {s.weeks} wk{s.shortenedReason ? ` — ${s.shortenedReason}` : ""}
          </p>
        ))}
        {plan.ramp?.days ? <p className="text-muted-foreground">Re-entry ramp: {plan.ramp.days} days</p> : null}
        <p className="text-muted-foreground">Throwing break: Hammers rule — 4 no-throw days per month of downtime (5–8 under 18 from the athlete's own signals)</p>
        {plan.throwing?.ramp?.active ? (
          <p className="text-muted-foreground">
            Throwing ramp: day {plan.throwing.ramp.dayIndex ?? 0} of {plan.throwing.ramp.days}
            {typeof plan.throwing.daysOff === "number" ? ` · ${plan.throwing.daysOff} days off taken` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
