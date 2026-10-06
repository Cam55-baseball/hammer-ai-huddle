import { useState } from "react";
import { Sprout, Ruler } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HeightFeetInchesInput, heightToInches } from "@/components/shared/HeightFeetInchesInput";
import { yearsOldFromDob } from "@/lib/auth/under13Lock";
import { Card, CardContent } from "@/components/ui/card";
import { useGrowthMode } from "@/hooks/useGrowthMode";
import { growthModeNote, type GrowthModeState } from "../../../supabase/functions/_shared/wic/growth/growthMode";

/** Shows while growth mode is on, and for 14 days after it turns off. */
export function GrowthModeCard() {
  const { data } = useGrowthMode();
  if (!data) return null;
  return <GrowthModeCardView state={data} />;
}

export function GrowthModeCardView({ state, today = new Date().toLocaleDateString("en-CA") }: { state: GrowthModeState; today?: string }) {
  const recentlyEnded = !!state.endedOn && (Date.parse(today) - Date.parse(state.endedOn)) / 86_400_000 <= 14;
  if (!state.active && !recentlyEnded) return null;
  const note = growthModeNote(state);
  if (!note) return null;
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex gap-3 p-4">
        <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{state.active ? "Growth mode: on" : "Growth mode: off"}</p>
          <p className="text-sm leading-6 text-muted-foreground">{note}</p>
          {state.active && state.grownInches != null && (
            <p className="text-xs text-muted-foreground">Why: you grew {state.grownInches} in within 3 months.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Players under 18: ask for a height update every 4 weeks. Saving writes
 * profiles.height_inches, which logs a height check, so growth mode updates
 * right away.
 */
export function HeightReminderCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const growth = useGrowthMode();
  const [height, setHeight] = useState("");
  const [saving, setSaving] = useState(false);
  const age = useQuery({
    queryKey: ["dob-age", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("date_of_birth").eq("id", user!.id).maybeSingle();
      return yearsOldFromDob(String((data as any)?.date_of_birth ?? ""));
    },
  });
  const last = growth.data?.lastCheck ?? null;
  const due = age.data != null && age.data < 18 && growth.data && (!last || (Date.now() - Date.parse(last)) / 86_400_000 >= 28);
  if (!due) return null;
  const save = async () => {
    const inches = heightToInches(height);
    if (!inches || !user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ height_inches: inches, height } as never).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("We couldn't save your height. Try again."); return; }
    toast.success("Height saved.");
    qc.invalidateQueries({ queryKey: ["growth-mode", user.id] });
  };
  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2"><Ruler className="h-5 w-5 text-primary" /><p className="text-sm font-semibold">Time to update your height</p></div>
        <p className="text-sm text-muted-foreground">Measure yourself today. Your plan adjusts when you're growing fast.</p>
        <HeightFeetInchesInput id="reminder-height" value={height} onChange={setHeight} required />
        <Button className="h-12 w-full" disabled={saving || !heightToInches(height)} onClick={save}>Save height</Button>
      </CardContent>
    </Card>
  );
}
