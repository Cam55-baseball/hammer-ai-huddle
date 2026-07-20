/**
 * FuelRecoveryStep — sleep target, hydration goal, diet style, allergies.
 * Best-effort persistence to per-slot draft; server writes deferred to
 * existing Nutrition / Wellness settings surfaces (no schema drift here).
 */
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { writeDraftSlot, readDraftSlot } from "@/lib/onboarding/draftStore";

interface FuelDraft {
  sleep_target_hrs?: number | null;
  water_goal_oz?: number | null;
  diet_style?: string;
  allergies?: string;
}

interface Props { onContinue: () => void; onBack: () => void; }

const DIETS = ["Omnivore", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Other"] as const;

export function FuelRecoveryStep({ onContinue, onBack }: Props) {
  const { user } = useAuth();
  const [sleep, setSleep] = useState("");
  const [water, setWater] = useState("");
  const [diet, setDiet] = useState<string>("");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const d = await readDraftSlot<FuelDraft>(user.id, "fuel-recovery");
      if (!d) return;
      if (d.sleep_target_hrs != null) setSleep(String(d.sleep_target_hrs));
      if (d.water_goal_oz != null) setWater(String(d.water_goal_oz));
      if (d.diet_style) setDiet(d.diet_style);
      if (d.allergies) setAllergies(d.allergies);
    })();
  }, [user?.id]);

  const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : null; };

  const persist = (patch: Partial<FuelDraft>) => {
    if (!user?.id) return;
    writeDraftSlot(user.id, "fuel-recovery", {
      sleep_target_hrs: num(sleep),
      water_goal_oz: num(water),
      diet_style: diet || undefined,
      allergies: allergies || undefined,
      ...patch,
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Utensils className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Fuel & recovery</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Tell Hammer how you sleep, hydrate, and eat. These seed your Nutrition
        Hub goals and daily recovery cues — every field is optional.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sleep-target" className="text-xs">Sleep target (hours/night)</Label>
          <Input id="sleep-target" type="number" inputMode="decimal" min={0} step={0.5}
            value={sleep} onChange={(e) => { setSleep(e.target.value); persist({ sleep_target_hrs: num(e.target.value) }); }}
            placeholder="e.g. 8" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="water-goal" className="text-xs">Daily water goal (oz)</Label>
          <Input id="water-goal" type="number" inputMode="decimal" min={0}
            value={water} onChange={(e) => { setWater(e.target.value); persist({ water_goal_oz: num(e.target.value) }); }}
            placeholder="e.g. 100" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Diet style</Label>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => {
            const active = diet === d;
            return (
              <button key={d} type="button"
                onClick={() => { setDiet(d); persist({ diet_style: d }); }}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                }`}>{d}</button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="allergies" className="text-xs">Allergies or foods to avoid</Label>
        <Textarea id="allergies" rows={2} value={allergies}
          onChange={(e) => { setAllergies(e.target.value); persist({ allergies: e.target.value }); }}
          placeholder="e.g. peanuts, shellfish, dairy" />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
        <Button onClick={onContinue}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </section>
  );
}
