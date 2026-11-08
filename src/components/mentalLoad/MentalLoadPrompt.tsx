import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureSwitches } from "@/hooks/useFeatureSwitches";
import {
  MENTAL_MINUTES_SETTING_KEY, prescribedMinutesFrom, resolveMinutes,
  type MentalActivity, type MentalKind,
} from "@/lib/mentalLoad/mentalLoad";

export interface MentalLoadPromptProps {
  activity: MentalActivity;
  activityId: string | null;
  activityDate: string;
  kind: MentalKind;
  trackedMinutes?: number | null;
  drillWorkSeconds?: number | null;
}

/**
 * Release A2: optional one-tap "How mentally draining was it?" (1–10) after a non-exercise card.
 * Shown only when `mental_load_v1` is on for this person. Skip saves nothing (unknown, never guessed)
 * and never blocks Done, which has already saved before this shows.
 */
export function MentalLoadPrompt(props: MentalLoadPromptProps) {
  const { isEnabled, loading } = useFeatureSwitches();
  const on = !loading && isEnabled("mental_load_v1");
  const [state, setState] = useState<"ask" | "saving" | "saved" | "skipped" | "error">("ask");
  const [msg, setMsg] = useState<string | null>(null);
  const minutesQ = useQuery({
    queryKey: ["mental-minutes-setting"],
    enabled: on,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const r = await supabase.from("app_settings").select("setting_value").eq("setting_key", MENTAL_MINUTES_SETTING_KEY).maybeSingle();
      if (r.error) throw r.error;
      return prescribedMinutesFrom(r.data?.setting_value);
    },
  });
  if (!on || !props.activityId || state === "skipped") return null;
  if (state === "saved") return <p className="text-sm text-muted-foreground" role="status">{msg}</p>;

  const rate = async (rating: number) => {
    setState("saving");
    const pick = resolveMinutes({ trackedMinutes: props.trackedMinutes, drillWorkSeconds: props.drillWorkSeconds, kind: props.kind, prescribed: minutesQ.data ?? {} });
    const { data, error } = await supabase.rpc("record_mental_load" as never, {
      _activity: props.activity, _activity_id: props.activityId, _rating: rating,
      _minutes: pick?.minutes ?? null, _minutes_source: pick?.source ?? null, _activity_date: props.activityDate,
    } as never);
    if (error) { setState("error"); setMsg("That didn't save. Tap a number again, or Skip."); return; }
    const res = (data ?? {}) as { ledger?: string };
    setMsg(res.ledger === "failed"
      ? `Saved your answer (${rating}/10), but it didn't reach your history yet.`
      : res.ledger === "unknown_minutes"
        ? `Saved: ${rating}/10 draining. This card has no set time, so its mental load stays unknown.`
        : `Saved: ${rating}/10 draining.`);
    setState("saved");
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3" aria-label="How mentally draining was it?">
      <p className="text-sm font-medium">How mentally draining was it? <span className="text-muted-foreground">(1 = not at all, 10 = very)</span></p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Button key={n} size="sm" variant="outline" className="h-8 w-8 p-0" disabled={state === "saving"} onClick={() => void rate(n)} aria-label={`${n} out of 10`}>{n}</Button>
        ))}
        <Button size="sm" variant="ghost" disabled={state === "saving"} onClick={() => setState("skipped")}>Skip</Button>
      </div>
      {state === "error" && msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
