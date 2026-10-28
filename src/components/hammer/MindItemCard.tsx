import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dailyMindItem, type MindKind } from "@/lib/hammer/week/weeklyVolume";
import { useTexVisionS2Priority } from "./TexVisionS2Priority";
import { useTexVisionProgress } from "@/hooks/useTexVisionProgress";
import { useDailyDrillSelection } from "@/hooks/useDailyDrillSelection";
import { loadOwnerPlanDrills, ownerMindDrill } from "@/lib/prescription/ownerPlanDrills";

const COPY: Record<MindKind, { title: string; how: string }> = {
  situations: { title: "Game situations", how: "Pick 3 game spots (runner on 2nd, 1 out). Say out loud what you'd do before the pitch." },
  film_study: { title: "Film study", how: "Watch one of your clips or a pro at-bat. Write one thing you'd copy." },
  tex_vision: { title: "Tex Vision", how: "Do today's Tex Vision session — it's already picked for you." },
  breathing: { title: "Breathing reset", how: "Breathe in 4 seconds, hold 4, out 6. Do it 5 times." },
  focus_routine: { title: "Focus routine", how: "Practice your between-pitch routine 5 times: breathe, look at a spot, one word cue." },
  journaling: { title: "Journal", how: "Write 3 lines: what went well, what to fix, how you feel." },
};

/** Tex Vision counts as prescribed only when the player has access and today's drills are picked. */
function useTexVisionPrescribed(): boolean {
  const { hasAccess, loading } = useTexVisionS2Priority();
  const sport = typeof window !== "undefined" && localStorage.getItem("selectedSport") === "softball" ? "softball" : "baseball";
  const { progress } = useTexVisionProgress(sport);
  const { dailyDrills } = useDailyDrillSelection(progress?.current_tier ?? "beginner", sport);
  return !loading && !!hasAccess && (dailyDrills?.length ?? 0) > 0;
}

/** One non-physical item every day, rest days included. Never adds physical work. Done counts in Discipline. */
export function MindItemCard({ planDate }: { planDate: string }) {
  const navigate = useNavigate();
  const texVisionPrescribed = useTexVisionPrescribed();
  const [done, setDone] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = Math.floor(new Date(`${planDate}T12:00:00Z`).getTime() / 86_400_000);
  const [ownerLoaded, setOwnerLoaded] = useState(false);
  useEffect(() => { void loadOwnerPlanDrills().then(() => setOwnerLoaded(true)); }, []);
  const builtIn = Number.isFinite(day) ? dailyMindItem(day, texVisionPrescribed).kind : null;
  const sport = typeof window !== "undefined" && localStorage.getItem("selectedSport") === "softball" ? "softball" : "baseball";
  // Owner Mind-tagged drills take the non-Tex-Vision days; a prescribed Tex Vision day stays Tex Vision.
  const owner = ownerLoaded && builtIn && builtIn !== "tex_vision" ? ownerMindDrill({ sport, day: new Date(`${planDate}T12:00:00Z`) }) : null;
  const kind = builtIn;

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data, error: e } = await supabase.from("mind_item_logs").select("id")
        .eq("user_id", auth.user.id).eq("item_date", planDate).maybeSingle();
      if (live) setDone(e ? null : !!data);
    })();
    return () => { live = false; };
  }, [planDate]);

  if (!kind) return null;
  const item = owner ? { title: owner.name, how: [owner.dosage, owner.cue].filter(Boolean).join(" · ") } : COPY[kind];

  const markDone = async () => {
    setSaving(true); setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); return; }
    const { error: e } = await supabase.from("mind_item_logs")
      .upsert({ user_id: auth.user.id, item_date: planDate, kind: owner ? "owner_mind" : kind, owner_drill_id: owner?.id ?? null }, { onConflict: "user_id,item_date", ignoreDuplicates: true });
    setSaving(false);
    if (e) setError("That didn't save. Tap Done again.");
    else setDone(true);
  };

  return (
    <Card aria-label="Today's Mind item">
      <CardContent className="flex gap-3 p-4">
        <Brain className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mind · no physical work</p>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.how}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {kind === "tex_vision" && (
              <Button size="sm" variant="outline" onClick={() => navigate("/tex-vision")}>Open Tex Vision</Button>
            )}
            {done ? (
              <p className="flex items-center gap-1 text-sm font-medium text-primary"><Check className="h-4 w-4" aria-hidden /> Done — counts toward Discipline</p>
            ) : (
              <Button size="sm" onClick={markDone} disabled={saving || done === null}>{saving ? "Saving…" : "Done"}</Button>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
