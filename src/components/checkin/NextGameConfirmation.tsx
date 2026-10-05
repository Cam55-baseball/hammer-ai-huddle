import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { getTodayDate } from "@/utils/dateUtils";
import { NEXT_GAME_ANSWERS, nextGameDraft, type NextGameAnswer } from "@/lib/hammer/tellHammers/parse";

export function NextGameConfirmation() {
  const timeline = useScheduleTimeline();
  const today = getTodayDate();
  const [selected, setSelected] = useState<NextGameAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answer = [...timeline.entries].filter(e => !e.undone_at && e.tag === "NOTE" && e.start_date === today && e.payload?.kind === "next_game_answer")
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0]?.payload?.answer;

  async function save(nothing: boolean) {
    if (nothing && selected) { setError("You picked a game answer. Tap Done to save it, or clear your choice before confirming nothing changed."); return; }
    if (!nothing && !selected) { setError("Choose when your next game is, then tap Done."); return; }
    setBusy(true);
    try {
      const entry = nothing
        ? { ...nextGameDraft(today, "not_sure"), payload: { kind: "next_game_answer", answer: "no_change" } }
        : nextGameDraft(today, selected as NextGameAnswer);
      await timeline.save(entry, "inbox");
      setSelected(null);
      setError(null);
    } catch {
      setError("Your game answer wasn't saved. Try again; you can still finish your check-in.");
    } finally { setBusy(false); }
  }

  return <section aria-label="When's your next game?" className="rounded-md border border-border bg-card p-3 space-y-3">
    <h3 className="font-semibold">When's your next game?</h3>
    {!timeline.enabled ? <p className="text-sm text-muted-foreground">Game updates can't be saved right now. You can still finish your check-in.</p> : <>
      {answer && <p role="status" className="text-sm text-muted-foreground">{answer === "no_change" ? "You confirmed nothing changed today." : "Your game answer is saved for today."}</p>}
      <div className="grid grid-cols-2 gap-2">{NEXT_GAME_ANSWERS.map(option =>
        <Button key={option.key} type="button" variant={selected === option.key ? "default" : "outline"} aria-pressed={selected === option.key} className="h-12 whitespace-normal" onClick={() => { setSelected(selected === option.key ? null : option.key); setError(null); }}>{option.label}</Button>
      )}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <Button type="button" disabled={busy} className="h-12" onClick={() => void save(false)}>Done</Button>
        <Button type="button" disabled={busy} variant="outline" className="h-12 whitespace-normal" onClick={() => void save(true)}>Nothing's changed</Button>
      </div>
    </>}
  </section>;
}