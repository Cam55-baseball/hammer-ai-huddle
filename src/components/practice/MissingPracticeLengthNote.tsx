import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PracticeLengthField } from "@/components/practice/PracticeLengthField";
import {
  PRACTICE_LENGTH_ASSUMPTION_LINE,
  parsePracticeLength,
  practiceLengthMissing,
  practiceLengthProblem,
} from "@/lib/practice/practiceLength";

/**
 * Owner Nov 10: one plain line under a practice whose length was never entered, with a way
 * to add it. Never blocks anything; saves only what the person types (never the assumed 60).
 */
export function MissingPracticeLengthNote({
  practice,
  onSaved,
}: {
  practice: { id: string; duration_minutes?: number | null; status?: string | null };
  onSaved?: (minutes: number) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMinutes, setSavedMinutes] = useState<number | null>(null);
  if (savedMinutes != null || !practiceLengthMissing(practice)) return null;

  const save = async () => {
    setTried(true);
    if (practiceLengthProblem(value)) return;
    const minutes = parsePracticeLength(value)!;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("scheduled_practice_sessions")
        .update({ duration_minutes: minutes })
        .eq("id", practice.id);
      if (error) throw error;
      setSavedMinutes(minutes);
      toast.success("Practice length saved");
      for (const k of ["schedule-window-practices", "manage-events", "calendar", "practice-log-prompt", "scheduled-sessions", "hammer-daily-plan"]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
      onSaved?.(minutes);
    } catch {
      toast.error("Couldn't save the length. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 space-y-2" data-testid="practice-length-missing">
      <p className="text-[11px] text-muted-foreground">
        {PRACTICE_LENGTH_ASSUMPTION_LINE}{" "}
        {!open && (
          <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
            Add length
          </button>
        )}
      </p>
      {open && (
        <div className="space-y-2 rounded-md border border-border/60 p-2">
          <PracticeLengthField id={`practice-length-${practice.id}`} value={value} onChange={setValue} showErrors={tried} />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>Save length</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>Not now</Button>
          </div>
        </div>
      )}
    </div>
  );
}
