/**
 * Training setup (v1.2 §B1) — behind the `training_intel_v1` flag.
 *
 * Renders nothing at all while the flag is off, so the app is unchanged.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrainingIntelV1 } from "@/lib/flags/trainingIntelV1";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PHASES = [
  { value: "offseason", label: "Offseason" },
  { value: "pre_season", label: "Pre-season" },
  { value: "in_season", label: "In season" },
  { value: "post_season", label: "Post-season" },
];

const OVERALL = [
  { value: "none", label: "Nothing" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "heavy", label: "Heavy" },
];

const THROWING = [
  { value: "not_throwing", label: "Not throwing" },
  { value: "catch_play", label: "Catch play" },
  { value: "long_toss", label: "Long toss" },
  { value: "bullpens", label: "Bullpens" },
  { value: "games", label: "Games" },
];

export function TrainingSetupCard() {
  const { enabled, loading } = useTrainingIntelV1();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phase: "offseason",
    days_into_phase: "",
    first_game_date: "",
    off_days: "",
    recent_overall: "moderate",
    recent_lifting_days_per_week: "3",
    recent_throwing_status: "long_toss",
    recent_practices_per_week: "3",
    days_since_last_loaded_lift: "",
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("training_intel_onboarding")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!data || cancelled) return;
      setForm((f) => ({
        ...f,
        phase: data.phase ?? f.phase,
        days_into_phase: data.days_into_phase?.toString() ?? "",
        first_game_date: data.first_game_date ?? "",
        recent_overall: data.recent_overall ?? f.recent_overall,
        recent_lifting_days_per_week: data.recent_lifting_days_per_week?.toString() ?? "3",
        recent_throwing_status: data.recent_throwing_status ?? f.recent_throwing_status,
        recent_practices_per_week: data.recent_practices_per_week?.toString() ?? "3",
        days_since_last_loaded_lift: data.days_since_last_loaded_lift?.toString() ?? "",
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (loading || !enabled) return null;

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in first.");
      const { error } = await supabase.from("training_intel_onboarding").upsert({
        user_id: auth.user.id,
        phase: form.phase,
        days_into_phase: num(form.days_into_phase),
        first_game_date: form.first_game_date || null,
        recent_overall: form.recent_overall,
        recent_lifting_days_per_week: num(form.recent_lifting_days_per_week),
        recent_throwing_status: form.recent_throwing_status,
        recent_practices_per_week: num(form.recent_practices_per_week),
        days_since_last_loaded_lift: num(form.days_since_last_loaded_lift),
      });
      if (error) throw error;
      toast.success("Training setup saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your setup.");
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  const picker = (k: keyof typeof form, options: { value: string; label: string }[]) => (
    <Select value={form[k]} onValueChange={(v) => setForm((f) => ({ ...f, [k]: v }))}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training setup</CardTitle>
        <CardDescription>
          A few answers so your plan starts where you actually are. You can change these any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Where you are now</Label>
            {picker("phase", PHASES)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="days-in">Days into it</Label>
            <Input id="days-in" inputMode="numeric" placeholder="0" {...field("days_into_phase")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first-game">First game</Label>
            <Input id="first-game" type="date" {...field("first_game_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="off-days">Days you know you'll be off</Label>
            <Input id="off-days" inputMode="numeric" placeholder="0" {...field("off_days")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Last four weeks</Label>
            {picker("recent_overall", OVERALL)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lift-days">Lifting days a week</Label>
            <Input id="lift-days" inputMode="numeric" {...field("recent_lifting_days_per_week")} />
          </div>
          <div className="space-y-2">
            <Label>Throwing</Label>
            {picker("recent_throwing_status", THROWING)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="practices">Practices a week</Label>
            <Input id="practices" inputMode="numeric" {...field("recent_practices_per_week")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="since-lift">Days since your last real lift</Label>
            <Input id="since-lift" inputMode="numeric" {...field("days_since_last_loaded_lift")} />
          </div>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save setup"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default TrainingSetupCard;
