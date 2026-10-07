/**
 * Round 8 Step 5b — log non-mound throws and pick-offs with the owner's counting rates.
 * Adds them (as pitch-equivalents) to today's mound pitches against the existing
 * Pitch Smart daily maximum. Display + logging only; never changes a plan card.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { THROW_WEIGHTS, pitchEquivalents, type ThrowKind } from "../../../supabase/functions/_shared/wic/phases/throwCount";

const ROWS: Array<{ kind: ThrowKind; label: string; pickoff?: boolean }> = [
  { kind: "off_mound_high", label: "Hard throws off the mound (4-seam or regular)" },
  { kind: "off_mound_low", label: "Easy throws off the mound" },
  { kind: "off_mound_other_pitch", label: "Off-mound throws of other pitches (curve, slider, change…)" },
  { kind: "pickoff_high", label: "Hard pick-off throws", pickoff: true },
  { kind: "pickoff_low", label: "Easy pick-off throws", pickoff: true },
  { kind: "pickoff_no_throw", label: "Pick-off footwork only (no throw)", pickoff: true },
];

export function ThrowCountLog({ today, moundPitches, dailyMax, showPickoffs }: {
  today: string; moundPitches: number; dailyMax: number | null; showPickoffs: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Record<ThrowKind, string>>>({});
  const [saving, setSaving] = useState(false);
  const key = ["throw-count", user?.id, today];
  const q = useQuery({
    queryKey: key, enabled: !!user, staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("wk_session_logs").select("metrics")
        .eq("user_id", user!.id).eq("plan_date", today).eq("template_id", "throw_count").limit(200);
      const list: Array<{ kind: ThrowKind; count: number }> = [];
      for (const r of data ?? []) for (const [k, c] of Object.entries((r.metrics?.counts ?? {}) as Record<string, number>))
        if (k in THROW_WEIGHTS) list.push({ kind: k as ThrowKind, count: Number(c) || 0 });
      return list;
    },
  });
  const rows = ROWS.filter((r) => showPickoffs || !r.pickoff);
  const logged = pitchEquivalents(q.data ?? []);
  const total = Math.round((moundPitches + logged) * 10) / 10;

  const save = async () => {
    const counts: Record<string, number> = {};
    for (const r of rows) { const n = Math.floor(Number(draft[r.kind])); if (n > 0) counts[r.kind] = n; }
    if (!Object.keys(counts).length || !user) return;
    setSaving(true);
    await (supabase as any).from("wk_session_logs").insert({
      user_id: user.id, plan_date: today, template_id: "throw_count",
      metrics: { counts, version: "throw_count_v2", pitch_equivalents: pitchEquivalents(Object.entries(counts).map(([k, c]) => ({ kind: k as ThrowKind, count: c }))) },
    });
    setSaving(false); setDraft({});
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/10 p-3" data-testid="throw-count-log">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Throw count today</div>
      <p className="text-xs" data-testid="throw-count-total">
        Arm total today: {total} pitch-equivalents{dailyMax != null ? ` of your ${dailyMax} daily max` : ""} ({moundPitches} mound pitches + {logged} from other throws).
      </p>
      {dailyMax != null && total >= dailyMax && (
        <p className="text-xs font-medium text-destructive">You've reached today's arm max — no more throwing today.</p>
      )}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <label key={r.kind} className="flex items-center gap-2 text-xs">
            <Input type="number" inputMode="numeric" min={0} className="h-8 w-16 shrink-0" aria-label={r.label}
              value={draft[r.kind] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [r.kind]: e.target.value }))} />
            <span className="min-w-0 flex-1">{r.label} <span className="text-muted-foreground">— each counts as {THROW_WEIGHTS[r.kind]}</span></span>
          </label>
        ))}
      </div>
      <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save throws"}</Button>
    </div>
  );
}
