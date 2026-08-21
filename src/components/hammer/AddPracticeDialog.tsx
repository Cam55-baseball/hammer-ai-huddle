/**
 * AddPracticeDialog — manual, athlete-authored practice scheduling.
 *
 * Covers every practice an athlete actually has: team practice, private
 * trainer/lesson work, personal solo work, and showcases/camps. Kind +
 * intensity feed the Hammers Today generator so the day's lift and skill
 * volume modulate around real practice load rather than ignoring it.
 *
 * Athlete-authored input only — never derived or inferred organism truth.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { noteProtectedEditing } from "@/lib/auth/protectedEditing";
import { Loader2, CalendarPlus } from "lucide-react";

const KINDS: Array<{ value: string; label: string; hint: string; intensity: "light" | "standard" | "heavy" }> = [
  { value: "team", label: "Team practice", hint: "Club / school / travel team", intensity: "heavy" },
  { value: "trainer", label: "Trainer / lesson", hint: "Private or academy session", intensity: "standard" },
  { value: "solo", label: "Personal practice", hint: "Cage, long toss, own work", intensity: "light" },
  { value: "showcase", label: "Showcase / camp", hint: "Tryout, combine, prospect day", intensity: "heavy" },
];

const MODULE_BY_KIND: Record<string, string> = {
  team: "practice",
  trainer: "practice",
  solo: "practice",
  showcase: "practice",
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddPracticeDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [kind, setKind] = useState("team");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayStr());
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("90");
  const [intensity, setIntensity] = useState<"light" | "standard" | "heavy">("heavy");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const pickKind = (v: string) => {
    noteProtectedEditing();
    setKind(v);
    const k = KINDS.find((x) => x.value === v);
    if (k) setIntensity(k.intensity);
  };

  const reset = () => {
    setKind("team");
    setTitle("");
    setDate(defaultDate ?? todayStr());
    setStartTime("");
    setDuration("90");
    setIntensity("heavy");
    setNotes("");
    setRecurring(false);
    setDays([]);
  };

  const save = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to schedule a practice.");
      return;
    }
    if (!date) {
      toast.error("Pick a date first.");
      return;
    }
    if (recurring && days.length === 0) {
      toast.error("Pick at least one weekday for a repeating practice.");
      return;
    }
    setSaving(true);
    try {
      const label = KINDS.find((k) => k.value === kind)?.label ?? "Practice";
      const { data: settings } = await (supabase as any)
        .from("profiles")
        .select("sport")
        .eq("id", user.id)
        .maybeSingle();
      const mins = Math.max(15, Math.min(360, Number(duration) || 90));

      const { error } = await (supabase as any).from("scheduled_practice_sessions").insert({
        user_id: user.id,
        created_by: user.id,
        session_module: MODULE_BY_KIND[kind] ?? "practice",
        session_type: kind,
        practice_kind: kind,
        intensity,
        duration_minutes: mins,
        title: title.trim() || label,
        description: notes.trim() || null,
        scheduled_date: date,
        start_time: startTime || null,
        recurring_active: recurring,
        recurring_days: recurring ? days : [],
        sport: settings?.sport || "baseball",
        status: "scheduled",
      });
      if (error) throw error;

      toast.success(
        recurring
          ? "Repeating practice saved — Hammer will plan around it every week."
          : "Practice saved — today's plan will modulate around it.",
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["calendar"] }),
        qc.invalidateQueries({ queryKey: ["hammer-daily-plan"] }),
        qc.invalidateQueries({ queryKey: ["game-day-context"] }),
      ]);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save that practice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-protected-editing="true">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Add a practice
          </DialogTitle>
          <DialogDescription>
            Team, trainer, or your own work — Hammer adjusts the day's lift and skill volume around it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => pickKind(k.value)}
                  className={`text-left rounded-md border p-2 transition ${
                    kind === k.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-xs font-medium">{k.label}</div>
                  <div className="text-[10px] text-muted-foreground">{k.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="practice-title" className="text-xs uppercase text-muted-foreground">Title (optional)</Label>
            <Input
              id="practice-title"
              value={title}
              placeholder={KINDS.find((k) => k.value === kind)?.label}
              onFocus={() => noteProtectedEditing()}
              onChange={(e) => { noteProtectedEditing(); setTitle(e.target.value); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="practice-date" className="text-xs uppercase text-muted-foreground">Date</Label>
              <Input
                id="practice-date"
                type="date"
                value={date}
                onFocus={() => noteProtectedEditing()}
                onChange={(e) => { noteProtectedEditing(); setDate(e.target.value); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="practice-time" className="text-xs uppercase text-muted-foreground">Start time</Label>
              <Input
                id="practice-time"
                type="time"
                value={startTime}
                onFocus={() => noteProtectedEditing()}
                onChange={(e) => { noteProtectedEditing(); setStartTime(e.target.value); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="practice-duration" className="text-xs uppercase text-muted-foreground">Minutes</Label>
              <Input
                id="practice-duration"
                inputMode="numeric"
                value={duration}
                onFocus={() => noteProtectedEditing()}
                onChange={(e) => { noteProtectedEditing(); setDuration(e.target.value.replace(/[^\d]/g, "")); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Intensity</Label>
              <div className="flex gap-1">
                {(["light", "standard", "heavy"] as const).map((lvl) => (
                  <Button
                    key={lvl}
                    type="button"
                    size="sm"
                    variant={intensity === lvl ? "default" : "outline"}
                    className="h-8 flex-1 text-[11px] capitalize"
                    onClick={() => { noteProtectedEditing(); setIntensity(lvl); }}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">Repeats weekly</Label>
              <Button
                type="button"
                size="sm"
                variant={recurring ? "default" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => { noteProtectedEditing(); setRecurring((v) => !v); }}
              >
                {recurring ? "On" : "Off"}
              </Button>
            </div>
            {recurring && (
              <div className="flex flex-wrap gap-1">
                {DOW.map((d, i) => (
                  <Badge
                    key={d}
                    variant={days.includes(i) ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    onClick={() => {
                      noteProtectedEditing();
                      setDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
                    }}
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="practice-notes" className="text-xs uppercase text-muted-foreground">Notes (optional)</Label>
            <Textarea
              id="practice-notes"
              rows={2}
              value={notes}
              placeholder="Focus, location, coach…"
              onFocus={() => noteProtectedEditing()}
              onChange={(e) => { noteProtectedEditing(); setNotes(e.target.value); }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save practice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
