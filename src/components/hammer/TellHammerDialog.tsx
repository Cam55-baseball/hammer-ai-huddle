/**
 * TellHammerDialog — free-form athlete dialogue surface for life/team/schedule
 * changes that don't fit a single onboarding slot. Examples:
 *   - "I got picked up by an independent team"
 *   - "We're in playoffs"
 *   - "16 games in a row coming up"
 *   - "Schedule is unknown until day-of"
 *
 * Persists the note onto `athlete_context.goal_summary` lineage via the
 * canonical `persistContextAnswer`, plus offers quick structured shortcuts
 * for season phase and competition level. Never authors organism truth —
 * always self-report confidence.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_SEASON: Array<{ value: "in_season" | "preseason" | "post_season"; label: string }> = [
  { value: "preseason", label: "Pre-season" },
  { value: "in_season", label: "In-season" },
  { value: "post_season", label: "Post-season" },
];

const QUICK_LEVELS: Array<{ value: string; label: string }> = [
  { value: "hs_jr", label: "HS junior" },
  { value: "hs_sr", label: "HS senior" },
  { value: "juco", label: "JUCO" },
  { value: "ncaa_d1", label: "NCAA D1" },
  { value: "indy_pro", label: "Independent pro" },
  { value: "milb", label: "Affiliated MiLB" },
];

export function TellHammerDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { updateSeasonStatus } = useSeasonStatus();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveNote() {
    if (!user || !note.trim() || busy) return;
    setBusy(true);
    try {
      // Append the change into goal_summary as a self-report note. This is
      // intentional: keeps the lineage on the canonical spine column, and
      // Hammer's prompt already reads goal_summary.
      const stamp = new Date().toISOString().slice(0, 10);
      const entry = `[${stamp}] ${note.trim()}`;
      await persistContextAnswer(user.id, "goal_summary", entry, "tell_hammer", "self_report");
      toast.success("Got it. Hammer will use this context.");
      setNote("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  async function setSeason(v: "in_season" | "preseason" | "post_season") {
    updateSeasonStatus({ season_status: v });
    toast.success(`Season set to ${v.replace("_", "-")}.`);
  }

  async function setLevel(v: string) {
    if (!user) return;
    try {
      await persistContextAnswer(user.id, "competition_level", v, "tell_hammer", "self_report");
      toast.success("Competition level updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update level");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tell Hammer what changed</DialogTitle>
          <DialogDescription>
            Anything new I should plan around — new team, in playoffs, a long
            stretch, schedule unknown, life context. Your words always outrank
            anything I infer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Quick: season phase</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {QUICK_SEASON.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setSeason(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Quick: competition level</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {QUICK_LEVELS.map((l) => (
                <Button
                  key={l.value}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => setLevel(l.value)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Or write it in your own words</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Picked up by an indy team last week, playing 16 games in 16 days, schedule released day-of."
              className="text-xs mt-1"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Close
            </Button>
            <Button size="sm" onClick={saveNote} disabled={busy || !note.trim()}>
              {busy ? "Saving…" : "Save context"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
