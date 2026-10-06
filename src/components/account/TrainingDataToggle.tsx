/** Settings toggle for players 13+: anonymous in-house training records (on unless turned off). */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { yearsOn } from "@/lib/parent/parentConsent";

export const TRAINING_DATA_13_TEXT =
  "Help improve Hammers Modality. We use your training information — what was prescribed, what you completed, what worked, and numbers like angles, timing and speeds — with your name, email, birthdate, photos and videos removed, to improve our training programs. It stays inside Hammers Modality and is never sold or given to other companies to train their AI. Turn this off anytime and we remove your records and stop collecting.";

export function TrainingDataToggle({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["training-data-toggle", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("date_of_birth, anon_training_opt_out").eq("id", userId).maybeSingle();
      return data as any;
    },
  });
  const age = q.data?.date_of_birth ? yearsOn(String(q.data.date_of_birth)) : null;
  if (age === null || age < 13) return null; // under 13: the parent decides in Parent controls
  const on = !q.data.anon_training_opt_out;
  const set = async (v: boolean) => {
    setBusy(true);
    try { await supabase.from("profiles").update({ anon_training_opt_out: !v } as any).eq("id", userId); await q.refetch(); }
    finally { setBusy(false); }
  };
  return (
    <Card className="mb-6 p-5">
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="leading-6">{TRAINING_DATA_13_TEXT}</span>
        <Switch checked={on} disabled={busy} onCheckedChange={set} aria-label="Help improve Hammers Modality" />
      </div>
    </Card>
  );
}
