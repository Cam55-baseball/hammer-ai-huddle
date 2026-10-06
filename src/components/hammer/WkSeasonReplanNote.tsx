/**
 * WkSeasonReplanNote — the day's "what changed" line in the day header.
 *
 * Shows the season re-plan reason (Step 21E3) and every logged change to
 * today's built plan (`wk_plan_changes`): what changed and why, in plain words.
 */
import { CalendarSync } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";

export function WkSeasonReplanNote() {
  const { replanReason, planChangeNotes } = useHammersToday() as unknown as {
    replanReason?: string | null;
    planChangeNotes?: Array<{ id: string; text: string }>;
  };
  const notes = (planChangeNotes ?? []).slice(0, 3).map((n) => n.text);
  const season = String(replanReason ?? "").trim();
  const lines = Array.from(new Set([...(season ? [season] : []), ...notes]));
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1">
      {lines.map((text) => (
        <div key={text} className="flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px] text-muted-foreground">
          <CalendarSync className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span><span className="font-semibold text-foreground">Plan change: </span>{text}</span>
        </div>
      ))}
    </div>
  );
}
