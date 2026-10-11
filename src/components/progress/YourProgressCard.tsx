import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp } from "lucide-react";
import { BATTERY, progressFor, relativeStrength, sideImbalances, slowestQuality, type Obs } from "@/lib/progress/testBattery";
import { verifiedMax, type LogRow } from "@/lib/lift/verifiedMax";
import { areasOf } from "../../../supabase/functions/_shared/wic/lift/areaMap";

const SINGLE_LEG = /(^|_)sl_|split|lunge|step_?up|single|rfess|cossack|staggered/;

export function YourProgressCard() {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const [key, setKey] = useState(BATTERY[0].key);
  const [value, setValue] = useState("");
  const [side, setSide] = useState<"left" | "right">("left");
  const [msg, setMsg] = useState<string | null>(null);
  const test = BATTERY.find((b) => b.key === key)!;

  const { data } = useQuery({
    queryKey: ["your-progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [obs, logs, prof] = await Promise.all([
        supabase.from("athlete_metric_observations").select("metric_key, value, recorded_at, capture_context").eq("user_id", user!.id).like("metric_key", "test.%").order("recorded_at").limit(500),
        supabase.from("wk_session_logs" as any).select("movement_slug, plan_date, load_used, reps_completed, metrics").eq("user_id", user!.id).not("load_used", "is", null).limit(600),
        supabase.from("profiles").select("weight").eq("id", user!.id).maybeSingle(),
      ]);
      const o: Obs[] = (obs.data ?? []).map((r: any) => ({ key: r.metric_key, value: Number(r.value), at: r.recorded_at, side: r.capture_context?.side ?? null }));
      const bySlug = new Map<string, LogRow[]>();
      for (const r of (logs.data ?? []) as any[]) bySlug.set(r.movement_slug, [...(bySlug.get(r.movement_slug) ?? []), r]);
      let two: number | null = null, one: number | null = null;
      for (const [slug, rows] of bySlug) {
        const a = areasOf(slug)[0];
        if (a !== "squat" && a !== "hinge") continue;
        const m = verifiedMax(rows);
        if (!m) continue;
        if (SINGLE_LEG.test(slug)) one = Math.max(one ?? 0, m); else two = Math.max(two ?? 0, m);
      }
      const bw = Number(String((prof.data as any)?.weight ?? "").replace(/[^\d.]/g, "")) || null;
      return { obs: o, two: relativeStrength(two, bw), one: relativeStrength(one, bw) };
    },
  });

  const progress = useMemo(() => progressFor(data?.obs ?? []), [data]);
  const slow = slowestQuality(progress);
  const sides = sideImbalances(progress);

  async function save() {
    setMsg(null);
    const v = Number(value);
    if (!v || v <= 0) return setMsg("Enter a number above 0.");
    const { error } = await supabase.rpc("record_my_test" as any, { p_key: key, p_value: v, p_unit: test.unit, p_side: test.sided ? side : null });
    if (error) return setMsg("Couldn't save. Try again.");
    setValue("");
    setMsg("Saved.");
    qc.invalidateQueries({ queryKey: ["your-progress"] });
  }

  return (
    <Card className="border-primary/20" data-testid="your-progress">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" /> Your progress</CardTitle>
        <p className="text-sm text-muted-foreground">Every test compared with your own first results. No outside targets.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Two-leg strength (max ÷ body weight)</div><div className="font-semibold">{data?.two != null ? `${data.two}× body weight` : "Log your sets to unlock"}</div></div>
          <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Single-leg strength (max ÷ body weight)</div><div className="font-semibold">{data?.one != null ? `${data.one}× body weight` : "Log your sets to unlock"}</div></div>
        </div>

        {progress.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tests yet. Log your first test below to set your starting point.</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {progress.map((q) => (
              <li key={q.key + q.side} className="flex items-center justify-between py-2 gap-2">
                <span>Test: {q.label}{q.side && q.side !== "any" ? ` (${q.side})` : ""}</span>
                <span className="text-right">
                  <span className="text-muted-foreground">Start {q.baseline.toFixed(1)} → Now </span>
                  <span className="font-semibold">{q.latest} {q.unit}</span>
                  {q.count >= 2 && <span className={q.changePct >= 0 ? "text-primary ml-2" : "text-destructive ml-2"}>{q.changePct >= 0 ? "+" : ""}{q.changePct}%</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {(slow || sides.length > 0) && (
          <div className="rounded-md border border-border p-2 text-sm space-y-1">
            {slow && <p>Focus: <b>{slow.label}</b> is improving the slowest ({slow.changePct}%).</p>}
            {sides.map((s) => <p key={s.label}>Side gap: {s.label} — your {s.weaker} side is {s.diffPct}% behind.</p>)}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Log a test</p>
          <select aria-label="Test" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={key} onChange={(e) => setKey(e.target.value)}>
            {BATTERY.map((b) => <option key={b.key} value={b.key}>{b.label} ({b.unit})</option>)}
          </select>
          <div className="flex gap-2">
            {test.sided && (
              <select aria-label="Side" className="rounded-md border border-input bg-background p-2 text-sm" value={side} onChange={(e) => setSide(e.target.value as any)}>
                <option value="left">Left</option><option value="right">Right</option>
              </select>
            )}
            <Input aria-label="Result" inputMode="decimal" placeholder={`Result in ${test.unit}`} value={value} onChange={(e) => setValue(e.target.value)} />
            <Button onClick={save}>Save</Button>
          </div>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
          <p className="text-xs text-muted-foreground">Test once each phase. Camera measuring comes later.</p>
        </div>
      </CardContent>
    </Card>
  );
}
