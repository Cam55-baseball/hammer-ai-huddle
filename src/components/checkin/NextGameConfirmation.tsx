import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { usePhaseState } from "@/hooks/usePhaseState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getTodayDate, getLocalDateString } from "@/utils/dateUtils";
import { nextGameQuestionNeeded } from "@/lib/hammer/tellHammers/nextGameQuestion";

/**
 * Owner Nov 1 B3: asked only when the schedule is unclear (in-season with no
 * upcoming game entered). A date saves a GAME entry on the same schedule
 * Update Hammer uses (which rebuilds the plan); "No game scheduled" is recorded.
 */
export function NextGameConfirmation() {
  const timeline = useScheduleTimeline();
  const { phaseState } = usePhaseState();
  const { user } = useAuth();
  const today = getTodayDate();
  const [day, setDay] = useState<Date | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [loggedGames, setLoggedGames] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    void (supabase as any).from("gp_games").select("game_date").eq("user_id", user.id).is("deleted_at", null)
      .gte("game_date", today).not("status", "in", "(canceled,cancelled,rescheduled)").limit(5)
      .then(({ data, error }: any) => { if (live) setLoggedGames(error ? null : (data ?? []).map((r: any) => String(r.game_date))); });
    return () => { live = false; };
  }, [user?.id, today]);

  const saved = [...timeline.entries].filter(e => !e.undone_at && e.tag === "NOTE" && e.start_date === today && e.payload?.kind === "next_game_answer")
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0]?.payload?.answer as string | undefined;
  const answer = justSaved ?? saved;
  const needed = nextGameQuestionNeeded({ season: phaseState?.season ?? null, today, entries: timeline.entries, loggedGameDates: loggedGames });
  if (!needed && !justSaved) return null;

  async function saveDate() {
    if (!day) { setError("Tap the day of your next game."); return; }
    const date = getLocalDateString(day);
    if (date < today) { setError("Pick today or a later day."); return; }
    setBusy(true);
    try {
      await timeline.save({ tag: "GAME", start_date: date, end_date: date, dates: [date], payload: {} }, "inbox");
      setJustSaved(`game:${date}`); setDay(undefined); setError(null);
    } catch { setError("Your game wasn't saved. Try again; you can still finish your check-in."); }
    finally { setBusy(false); }
  }
  async function saveNone() {
    setBusy(true);
    try {
      await timeline.save({ tag: "NOTE", start_date: today, end_date: today, dates: null, payload: { kind: "next_game_answer", answer: "none_scheduled" } }, "inbox");
      setJustSaved("none_scheduled"); setError(null);
    } catch { setError("Your answer wasn't saved. Try again; you can still finish your check-in."); }
    finally { setBusy(false); }
  }

  return <section aria-label="When's your next game?" className="rounded-md border border-border bg-card p-3 space-y-3">
    <h3 className="font-semibold">When's your next game?</h3>
    {!timeline.enabled ? <p className="text-sm text-muted-foreground">Game updates can't be saved right now. You can still finish your check-in.</p> : <>
      {answer && <p role="status" className="text-sm text-muted-foreground">{answer.startsWith("game:") ? `Saved: game on ${answer.slice(5)}. Your plan was rebuilt.` : answer === "none_scheduled" ? "Saved: no game scheduled." : "Your game answer is saved for today."}</p>}
      {!justSaved && <>
        <Calendar mode="single" selected={day} onSelect={(d) => { setDay(d ?? undefined); setError(null); }} disabled={(d) => getLocalDateString(d) < today}
          className="mx-auto rounded-md border pointer-events-auto [&_button]:h-11 [&_button]:w-11" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" disabled={busy || !day} className="h-12 whitespace-normal" onClick={() => void saveDate()}>Save this game day</Button>
          <Button type="button" disabled={busy} variant="outline" className="h-12 whitespace-normal" onClick={() => void saveNone()}>No game scheduled</Button>
        </div>
      </>}
    </>}
  </section>;
}
