/**
 * AnthropometricsStep — height, weight, wingspan, body fat.
 *
 * Persists to athlete_context.anthropometrics (JSON) via persistContextAnswer.
 * All fields optional — missingness is preserved, never imputed.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { writeDraftSlot, readDraftSlot } from "@/lib/onboarding/draftStore";

interface Anthro {
  height_in?: number | null;
  weight_lb?: number | null;
  wingspan_in?: number | null;
  body_fat_pct?: number | null;
}

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

const num = (s: string): number | null => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function AnthropometricsStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [wingspan, setWingspan] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      // 1) Local draft first
      const draft = await readDraftSlot<Anthro>(user.id, "anthropometrics");
      if (draft) {
        if (draft.height_in) setHeight(String(draft.height_in));
        if (draft.weight_lb) setWeight(String(draft.weight_lb));
        if (draft.wingspan_in) setWingspan(String(draft.wingspan_in));
        if (draft.body_fat_pct) setBodyFat(String(draft.body_fat_pct));
        return;
      }
      // 2) Server hydration from athlete_context.anthropometrics
      const { data } = await supabase
        .from("athlete_context")
        .select("anthropometrics")
        .eq("user_id", user.id)
        .maybeSingle();
      const a = (data as { anthropometrics: Anthro | null } | null)?.anthropometrics;
      if (a) {
        if (a.height_in) setHeight(String(a.height_in));
        if (a.weight_lb) setWeight(String(a.weight_lb));
        if (a.wingspan_in) setWingspan(String(a.wingspan_in));
        if (a.body_fat_pct) setBodyFat(String(a.body_fat_pct));
      }
    })();
  }, [user?.id]);

  const persistDraft = (patch: Partial<Anthro>) => {
    if (!user?.id) return;
    writeDraftSlot(user.id, "anthropometrics", {
      height_in: num(height),
      weight_lb: num(weight),
      wingspan_in: num(wingspan),
      body_fat_pct: num(bodyFat),
      ...patch,
    });
  };

  const handleSaveAndNext = async () => {
    if (!user?.id) return onContinue();
    setSaving(true);
    try {
      const payload: Anthro = {
        height_in: num(height),
        weight_lb: num(weight),
        wingspan_in: num(wingspan),
        body_fat_pct: num(bodyFat),
      };
      const hasAny = Object.values(payload).some((v) => v != null);
      if (hasAny) {
        await persistContextAnswer(user.id, "anthropometrics", payload, "onboarding.anthropometrics");
      }
      onContinue();
    } catch (e) {
      console.warn("[onboarding] anthropometrics save failed", e);
      toast.warning("Couldn't save anthropometrics — you can update later in Profile.");
      onContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Ruler className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Body measurements</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Optional but helpful — Hammer uses these to scale load, wingspan drills,
        and body-comp tracking. Leave blank if you'd rather skip; nothing gets
        estimated for you.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="anthro-height" className="text-xs">Height (inches)</Label>
          <Input
            id="anthro-height"
            type="number"
            inputMode="decimal"
            value={height}
            onChange={(e) => { setHeight(e.target.value); persistDraft({ height_in: num(e.target.value) }); }}
            placeholder="e.g. 70"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="anthro-weight" className="text-xs">Weight (lb)</Label>
          <Input
            id="anthro-weight"
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); persistDraft({ weight_lb: num(e.target.value) }); }}
            placeholder="e.g. 175"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="anthro-wingspan" className="text-xs">Wingspan (inches)</Label>
          <Input
            id="anthro-wingspan"
            type="number"
            inputMode="decimal"
            value={wingspan}
            onChange={(e) => { setWingspan(e.target.value); persistDraft({ wingspan_in: num(e.target.value) }); }}
            placeholder="fingertip to fingertip"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="anthro-bf" className="text-xs">Body fat % (if known)</Label>
          <Input
            id="anthro-bf"
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => { setBodyFat(e.target.value); persistDraft({ body_fat_pct: num(e.target.value) }); }}
            placeholder="optional"
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
        <Button onClick={handleSaveAndNext} disabled={saving}>
          {saving ? "Saving…" : "Save & continue"}<ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
