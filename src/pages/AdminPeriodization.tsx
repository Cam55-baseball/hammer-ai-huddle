/**
 * AdminPeriodization — owner-tunable phase-block dosing for wk_periodization_blocks.
 *
 * Lets a privileged user (admins or themselves) override the 4-quarter
 * offseason + in-season + post-season targets used by `wk-generate-daily`.
 * No-op-safe: simply edits rows in `wk_periodization_blocks` keyed by `(user_id, phase)`.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Save } from "lucide-react";

type PhaseRow = {
  id?: string;
  user_id?: string;
  phase: string;
  compound_sets: number;
  compound_reps_low: number;
  compound_reps_high: number;
  supplemental_sets: number;
  speed_interval_hours: number;
  cns_unit_cap: number;
  lift_style: string;
  supplemental_style: string;
  conditioning_focus: string;
};

const PHASES = [
  { key: "off_q1", label: "Offseason Q1 — Strength & Capacity" },
  { key: "off_q2", label: "Offseason Q2 — Double-Ecc Compounds" },
  { key: "off_q3", label: "Offseason Q3 — Eccentric + FP" },
  { key: "off_q4", label: "Offseason Q4 — Eccentric + FP (taper)" },
  { key: "in_season", label: "In-Season — Concentric + FP" },
  { key: "post_season", label: "Post-Season — Restorative" },
];

export default function AdminPeriodization() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, PhaseRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("wk_periodization_blocks" as any)
        .select("*")
        .eq("user_id", user.id);
      if (error) {
        toast.error("Could not load phase blocks");
        setLoading(false);
        return;
      }
      const map: Record<string, PhaseRow> = {};
      (data ?? []).forEach((r: any) => { map[r.phase] = r as PhaseRow; });
      // Seed defaults for any missing phase.
      PHASES.forEach((p) => {
        if (!map[p.key]) {
          map[p.key] = {
            phase: p.key,
            compound_sets: p.key === "in_season" ? 3 : 4,
            compound_reps_low: 2,
            compound_reps_high: 5,
            supplemental_sets: 3,
            speed_interval_hours: p.key.startsWith("off_q1") || p.key === "off_q2" ? 48 : p.key === "in_season" ? 96 : 72,
            cns_unit_cap: p.key === "in_season" ? 6 : 9,
            lift_style: p.key === "in_season" ? "concentric" : p.key.startsWith("off_q3") || p.key === "off_q4" ? "eccentric" : "double_eccentric",
            supplemental_style: p.key.startsWith("off_q1") || p.key === "off_q2" ? "kot_full_rom" : "functional_patterning",
            conditioning_focus: p.key === "in_season" ? "inning_restart_intervals" : "aerobic_base_plus_cross_sport",
          };
        }
      });
      setRows(map);
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async (phase: string) => {
    if (!user?.id) return;
    setSaving(phase);
    const row = rows[phase];
    const { error } = await supabase
      .from("wk_periodization_blocks" as any)
      .upsert(
        { ...row, user_id: user.id, phase },
        { onConflict: "user_id,phase" },
      );
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Saved ${phase}`);
  };

  const upd = (phase: string, patch: Partial<PhaseRow>) =>
    setRows((m) => ({ ...m, [phase]: { ...m[phase], ...patch } }));

  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold">Periodization tuning</h1>
          <p className="text-xs text-muted-foreground">
            Adjust the dosing the engine uses each phase. Quarters auto-resolve
            from your Season Dates; these numbers control sets, reps, CNS caps,
            speed cadence and styles per quarter.
          </p>
        </div>
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          PHASES.map((p) => {
            const r = rows[p.key];
            if (!r) return null;
            return (
              <Card key={p.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span>{p.label}</span>
                    <Badge variant="outline" className="text-[10px]">{p.key}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <NumField label="Compound sets" value={r.compound_sets} onChange={(v) => upd(p.key, { compound_sets: v })} />
                  <NumField label="Reps low" value={r.compound_reps_low} onChange={(v) => upd(p.key, { compound_reps_low: v })} />
                  <NumField label="Reps high" value={r.compound_reps_high} onChange={(v) => upd(p.key, { compound_reps_high: v })} />
                  <NumField label="Supplemental sets" value={r.supplemental_sets} onChange={(v) => upd(p.key, { supplemental_sets: v })} />
                  <NumField label="Speed every (h)" value={r.speed_interval_hours} onChange={(v) => upd(p.key, { speed_interval_hours: v })} />
                  <NumField label="CNS cap" value={r.cns_unit_cap} onChange={(v) => upd(p.key, { cns_unit_cap: v })} />
                  <TextField label="Lift style" value={r.lift_style} onChange={(v) => upd(p.key, { lift_style: v })} />
                  <TextField label="Supplemental style" value={r.supplemental_style} onChange={(v) => upd(p.key, { supplemental_style: v })} />
                  <TextField label="Conditioning focus" value={r.conditioning_focus} onChange={(v) => upd(p.key, { conditioning_focus: v })} />
                  <div className="col-span-2 md:col-span-3 flex justify-end">
                    <Button size="sm" onClick={() => save(p.key)} disabled={saving === p.key} className="gap-1">
                      {saving === p.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save phase
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8" />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
    </div>
  );
}
