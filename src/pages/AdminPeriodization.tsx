/**
 * AdminPeriodization — owner-tunable phase-block dosing for `wk_periodization_blocks`.
 *
 * The phase blocks are GLOBAL (one row per `phase`) — they describe how the
 * `wk-generate-daily` engine doses each phase of the 4-quarter offseason +
 * in-season + post-season model for every athlete on the platform.
 *
 * Gated behind `useOwnerAccess` so only an owner role can tune the engine.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";

type PhaseRow = {
  id?: string;
  phase: string;
  display_name?: string | null;
  compound_style?: string | null;
  supplemental_style?: string | null;
  speed_cadence_hours?: number | null;
  cross_sport_cadence?: string | null;
  compound_min_sets?: number | null;
  compound_max_sets?: number | null;
  compound_min_reps?: number | null;
  compound_max_reps?: number | null;
  cns_unit_cap?: number | null;
  notes?: string | null;
};

const PHASES = [
  { key: "off_q1", label: "Offseason Q1 — Strength & Capacity" },
  { key: "off_q2", label: "Offseason Q2 — Double-Ecc Compounds" },
  { key: "off_q3", label: "Offseason Q3 — Eccentric + FP" },
  { key: "off_q4", label: "Offseason Q4 — Eccentric + FP (taper)" },
  { key: "in_season", label: "In-Season — Concentric + FP" },
  { key: "post_season", label: "Post-Season — Restorative" },
];

function seedFor(phase: string): PhaseRow {
  const inSeason = phase === "in_season";
  const earlyOff = phase === "off_q1" || phase === "off_q2";
  const lateOff = phase === "off_q3" || phase === "off_q4";
  return {
    phase,
    display_name: PHASES.find((p) => p.key === phase)?.label ?? phase,
    compound_style: inSeason
      ? "concentric"
      : lateOff
        ? "eccentric"
        : "double_eccentric",
    supplemental_style: earlyOff ? "kot_full_rom" : "functional_patterning",
    speed_cadence_hours: earlyOff ? 48 : inSeason ? 96 : 72,
    cross_sport_cadence: "daily",
    compound_min_sets: inSeason ? 2 : 3,
    compound_max_sets: inSeason ? 3 : 5,
    compound_min_reps: 2,
    compound_max_reps: 5,
    cns_unit_cap: inSeason ? 6 : 9,
    notes: null,
  };
}

export default function AdminPeriodization() {
  const navigate = useNavigate();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const [rows, setRows] = useState<Record<string, PhaseRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (ownerLoading || !isOwner) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("wk_periodization_blocks" as any)
        .select("*");
      if (error) {
        toast.error("Could not load phase blocks");
        setLoading(false);
        return;
      }
      const map: Record<string, PhaseRow> = {};
      ((data ?? []) as any[]).forEach((r) => { map[r.phase] = r as PhaseRow; });
      PHASES.forEach((p) => { if (!map[p.key]) map[p.key] = seedFor(p.key); });
      setRows(map);
      setLoading(false);
    })();
  }, [isOwner, ownerLoading]);

  const save = async (phase: string) => {
    setSaving(phase);
    const row = rows[phase];
    const { error } = await supabase
      .from("wk_periodization_blocks" as any)
      .upsert({ ...row, phase }, { onConflict: "phase" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Saved ${phase}`);
  };

  const upd = (phase: string, patch: Partial<PhaseRow>) =>
    setRows((m) => ({ ...m, [phase]: { ...m[phase], ...patch } }));

  if (ownerLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <div className="text-sm font-medium">Owner access required</div>
        <p className="text-xs text-muted-foreground max-w-sm">
          Periodization tuning is restricted to platform owners. Contact your administrator
          if you need to adjust engine dosing.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

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
            from Season Dates; these numbers control sets, reps, CNS caps,
            speed cadence and styles per quarter — globally across the platform.
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
                  <NumField label="Compound min sets" value={r.compound_min_sets ?? 0} onChange={(v) => upd(p.key, { compound_min_sets: v })} />
                  <NumField label="Compound max sets" value={r.compound_max_sets ?? 0} onChange={(v) => upd(p.key, { compound_max_sets: v })} />
                  <NumField label="Reps low" value={r.compound_min_reps ?? 0} onChange={(v) => upd(p.key, { compound_min_reps: v })} />
                  <NumField label="Reps high" value={r.compound_max_reps ?? 0} onChange={(v) => upd(p.key, { compound_max_reps: v })} />
                  <NumField label="Speed every (h)" value={r.speed_cadence_hours ?? 0} onChange={(v) => upd(p.key, { speed_cadence_hours: v })} />
                  <NumField label="CNS cap" value={r.cns_unit_cap ?? 0} onChange={(v) => upd(p.key, { cns_unit_cap: v })} />
                  <TextField label="Compound style" value={r.compound_style ?? ""} onChange={(v) => upd(p.key, { compound_style: v })} />
                  <TextField label="Supplemental style" value={r.supplemental_style ?? ""} onChange={(v) => upd(p.key, { supplemental_style: v })} />
                  <TextField label="Cross-sport cadence" value={r.cross_sport_cadence ?? ""} onChange={(v) => upd(p.key, { cross_sport_cadence: v })} />
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
