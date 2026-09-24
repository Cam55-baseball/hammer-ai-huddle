/**
 * v1.1 §D/§E — "Anything change?" and "When's your next game?" inside the
 * morning and night check-ins. Same entries as the Tell Hammers inbox (same
 * drafts, same source, same dedupe, same re-plan). Hidden when Tell Hammers is off.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { getTodayDate } from "@/utils/dateUtils";
import { isoShift } from "../../../supabase/functions/_shared/wic/schedule/timeline";
import {
  lifeChipDraft, painChipDraft, nextGameDraft, NEXT_GAME_ANSWERS, FACE_LABEL,
  type EntryDraft, type LifeChip,
} from "@/lib/hammer/tellHammers/parse";
import { REPORT_INJURY_REGIONS } from "@/lib/hammer/injury/reportInjury";

const CHIPS: { key: LifeChip | "pain"; label: string }[] = [
  { key: "travel", label: "Travelling" },
  { key: "break", label: "Need a break" },
  { key: "pain", label: "Something hurts" },
  { key: "cancelled", label: "Games cancelled" },
  { key: "resume", label: "Back to normal" },
];
const FACES = [
  { key: "little", emoji: "🙂" },
  { key: "lot", emoji: "😣" },
  { key: "cant", emoji: "😭" },
] as const;

export function CheckInLifeChips() {
  const tl = useScheduleTimeline();
  const today = getTodayDate();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pain, setPain] = useState<{ key: string; label: string } | "pick" | null>(null);

  // Re-ask weekly until the answer is known (not "not sure").
  const askNextGame = useMemo(() => {
    const recent = tl.entries.find(
      (e) => !e.undone_at && e.tag === "NOTE" && (e.payload as any)?.kind === "next_game_answer" && e.start_date >= isoShift(today, -6),
    );
    return !recent || (recent.payload as any)?.answer === "not_sure" && recent.start_date < today;
  }, [tl.entries, today]);

  if (!tl.enabled) return null;

  async function save(d: EntryDraft) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await tl.save(d, "inbox");
      setDone(res.merged ? "You already told me this — I updated it." : res.message);
      setPain(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid="checkin-life-chips">
      <p className="text-sm font-bold">Anything change?</p>
      {done ? (
        <p className="text-sm text-muted-foreground">{done}</p>
      ) : pain === "pick" ? (
        <div className="grid grid-cols-3 gap-2">
          {REPORT_INJURY_REGIONS.map((r) => (
            <Button key={r.key} type="button" variant="outline" size="sm" onClick={() => setPain(r)}>{r.label}</Button>
          ))}
        </div>
      ) : pain ? (
        <div className="grid grid-cols-3 gap-2">
          {FACES.map((f) => (
            <Button key={f.key} type="button" variant="outline" className="h-20 flex-col" disabled={busy}
              onClick={() => save(painChipDraft(today, pain, f.key))}>
              <span className="text-2xl" aria-hidden>{f.emoji}</span>
              <span className="text-xs">{FACE_LABEL[f.key]}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <Button type="button" className="h-14 w-full text-base" onClick={() => setDone("Got it — nothing changed.")} data-testid="chip-nope">
            Nope
          </Button>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <Button key={c.key} type="button" variant="outline" size="sm" disabled={busy} data-testid={`life-${c.key}`}
                onClick={() => (c.key === "pain" ? setPain("pick") : save(lifeChipDraft(c.key, today)))}>
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {askNextGame && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-bold">When's your next game?</p>
          <div className="grid grid-cols-2 gap-2">
            {NEXT_GAME_ANSWERS.map((a) => (
              <Button key={a.key} type="button" variant="outline" size="sm" disabled={busy} data-testid={`next-game-${a.key}`}
                onClick={() => save(nextGameDraft(today, a.key))}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckInLifeChips;
