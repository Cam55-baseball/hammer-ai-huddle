/**
 * Round 8 Step 6 — when no level of play is saved, the plan builder uses an
 * age default (under 14 middle school, 14–15 JV, 16+ varsity). This asks the
 * player to save their real level. Saving never changes today's cards.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import { CompetitionLevelPicker } from "@/components/shared/CompetitionLevelPicker";

export function ageDefaultLabel(age: number | null): string | null {
  if (age == null) return null;
  return age < 14 ? "Middle school" : age < 16 ? "High school JV" : "High school varsity";
}

export function ageNow(dob: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob + "T12:00:00"), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return Number.isFinite(a) ? a : null;
}

export function CompetitionLevelPrompt({ sport }: { sport: "baseball" | "softball" }) {
  const { user } = useOptionalAuth();
  const ctx = useHammerAthleteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const dob = useQuery({
    queryKey: ["level-prompt-dob", user?.id], enabled: !!user,
    queryFn: async () => ((await supabase.from("profiles").select("date_of_birth").eq("id", user!.id).maybeSingle()).data as any)?.date_of_birth ?? null,
  });
  const level = ctx.get<unknown>("competition_level")?.value;
  if (!user || saved || (typeof level === "string" && level.trim() !== "") || dob.isLoading) return null;
  const label = ageDefaultLabel(ageNow(dob.data ?? null));
  if (!label) return null;
  return (
    <div data-level-prompt className="rounded-md border border-border p-2 text-xs space-y-1">
      <p><span className="font-medium">Level of play:</span> not saved yet — your plan uses <span className="font-medium">{label}</span> for your age.</p>
      {!open ? (
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOpen(true)}>Save my real level</Button>
      ) : (
        <CompetitionLevelPicker sport={sport} value="" onChange={async (v) => {
          const next = typeof v === "string" ? v : v.level;
          try {
            await persistContextAnswer(user.id, "competition_level", next, "level_prompt", "self_report");
            setSaved(true); qc.invalidateQueries();
            toast.success("Level saved. It's used from your next plan.");
          } catch { toast.error("Couldn't save — try again."); }
        }} />
      )}
    </div>
  );
}
