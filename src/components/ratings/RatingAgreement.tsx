import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props { athleteId: string; sport: string | null; position: string | null; testKey: string; metricKey: string; grade: number }

/** Coach-only feedback on a shown rating. Saving never changes the rating. */
export function RatingAgreement(p: Props) {
  const { user } = useAuth();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  if (!user) return null;
  const save = async () => {
    if (choice === null) return;
    setState("saving");
    const { error } = await supabase.from("rating_agreements").insert({
      coach_id: user.id, athlete_id: p.athleteId, sport: p.sport ?? "not_recorded", position: p.position,
      test_key: p.testKey, metric_key: p.metricKey, grade: Math.round(p.grade * 10) / 10, agree: choice, note: note.trim() || null,
    });
    setState(error ? "error" : "saved");
  };
  if (state === "saved") return <p className="text-xs text-muted-foreground">Thanks — your answer was saved. The rating stays the same.</p>;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-medium">Do you agree with this rating?</p>
      <div className="flex gap-2">
        <Button size="sm" variant={choice === true ? "default" : "outline"} onClick={() => setChoice(true)}>Agree</Button>
        <Button size="sm" variant={choice === false ? "default" : "outline"} onClick={() => setChoice(false)}>Disagree</Button>
      </div>
      {choice !== null && (
        <>
          <Textarea maxLength={500} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" onClick={save} disabled={state === "saving"}>Save answer</Button>
          {state === "error" && <p className="text-xs text-destructive">Couldn't save. Try again.</p>}
        </>
      )}
    </div>
  );
}
