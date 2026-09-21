/**
 * WkSeasonReplanNote — Step 21E3.
 *
 * The day's reason lives in the day header, not on movement cards. When the
 * athlete's season changes (dates, phase, a game added, an off day added)
 * Hammer re-plans the next 7 days and says so here, in plain words.
 */
import { CalendarSync } from "lucide-react";
import { useHammersToday } from "@/components/hammer/HammersTodayProvider";

export function WkSeasonReplanNote() {
  const { replanReason } = useHammersToday() as unknown as { replanReason?: string | null };
  const text = String(replanReason ?? "").trim();
  if (!text) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px] text-muted-foreground">
      <CalendarSync className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}
