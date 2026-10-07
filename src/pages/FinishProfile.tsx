/**
 * Finish-your-profile steps the main onboarding doesn't cover on its own:
 * body measurements (only the missing ones are asked), level of play and
 * years of lifting. Saves merge into athlete_context — saved values are
 * never asked again or overwritten.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useProfileGaps } from "@/hooks/onboarding/useProfileGaps";
import { BODY_FIELDS, missingBodyFields } from "@/lib/onboarding/profileGaps";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { supabase } from "@/integrations/supabase/client";
import { CompetitionLevelPicker } from "@/components/shared/CompetitionLevelPicker";

export default function FinishProfile() {
  const [params] = useSearchParams();
  const step = params.get("step") ?? "body";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useOptionalAuth();
  const { anthropometrics, under13, loading } = useProfileGaps();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [years, setYears] = useState("");
  const [busy, setBusy] = useState(false);

  const done = async (msg: string) => {
    await qc.invalidateQueries();
    toast.success(msg);
    navigate("/dashboard");
  };

  const saveBody = async () => {
    if (!user) return;
    setBusy(true);
    try {
      // Re-read so nothing saved elsewhere since is overwritten.
      const { data } = await supabase.from("athlete_context").select("anthropometrics").eq("user_id", user.id).maybeSingle();
      const prior = ((data as { anthropometrics?: Record<string, unknown> } | null)?.anthropometrics ?? {}) as Record<string, unknown>;
      const open = new Set(missingBodyFields(prior));
      const add: Record<string, number> = {};
      for (const [k, v] of Object.entries(vals)) { const n = Number(v); if (open.has(k) && Number.isFinite(n) && n > 0) add[k] = n; }
      if (!Object.keys(add).length) { toast.error("Enter at least one measurement."); return; }
      await persistContextAnswer(user.id, "anthropometrics", { ...prior, ...add } as never, "finish_profile", "self_report");
      await done("Saved. Your next plan uses these.");
    } catch { toast.error("Couldn't save — try again."); } finally { setBusy(false); }
  };

  const missing = missingBodyFields(anthropometrics);
  const who = under13 ? "your player's" : "your";

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      {under13 && <p className="rounded-md border border-border p-2 text-xs">Parent or guardian: please fill this in for your player.</p>}
      {loading ? null : step === "body" ? (
        <section className="space-y-3">
          <h1 className="text-lg font-semibold">Body measurements</h1>
          <p className="text-xs text-muted-foreground">Limb lengths help pick the lifts that fit {who} body. Estimates are fine — skip any you don't know.</p>
          {missing.length === 0 ? <p className="text-sm">All measurements are saved.</p> : (
            <div className="grid grid-cols-2 gap-2">
              {BODY_FIELDS.filter((f) => missing.includes(f.key)).map((f) => (
                <div key={f.key}>
                  <Label className="text-xs" htmlFor={`fp-${f.key}`}>{f.label}</Label>
                  <Input id={`fp-${f.key}`} type="number" inputMode="decimal" step="0.25" value={vals[f.key] ?? ""}
                    onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
                  {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
                </div>
              ))}
            </div>
          )}
          {missing.length > 0 && <Button disabled={busy} onClick={saveBody} className="w-full">Save measurements</Button>}
        </section>
      ) : step === "level" ? (
        <section className="space-y-3">
          <h1 className="text-lg font-semibold">Level of play</h1>
          <p className="text-xs text-muted-foreground">{under13 ? "Your player's" : "Your"} level sets how hard and how much the plan trains.</p>
          <CompetitionLevelPicker sport="baseball" value="" onChange={async (v) => {
            if (!user) return;
            try {
              await persistContextAnswer(user.id, "competition_level", typeof v === "string" ? v : v.level, "finish_profile", "self_report");
              await done("Level saved. It's used from your next plan.");
            } catch { toast.error("Couldn't save — try again."); }
          }} />
        </section>
      ) : (
        <section className="space-y-3">
          <h1 className="text-lg font-semibold">Years of lifting</h1>
          <p className="text-xs text-muted-foreground">How long {under13 ? "your player has" : "you've"} lifted weights sets safe starting weights. Enter 0 if never.</p>
          <Label className="text-xs" htmlFor="fp-years">Years of lifting</Label>
          <Input id="fp-years" type="number" inputMode="decimal" step="0.5" min="0" value={years} onChange={(e) => setYears(e.target.value)} />
          <Button className="w-full" disabled={busy || years === "" || !(Number(years) >= 0)} onClick={async () => {
            if (!user) return;
            setBusy(true);
            try { await persistContextAnswer(user.id, "lifting_age_years", Number(years), "finish_profile", "self_report"); await done("Saved. Your next plan uses this."); }
            catch { toast.error("Couldn't save — try again."); } finally { setBusy(false); }
          }}>Save</Button>
        </section>
      )}
    </div>
  );
}
