/**
 * TellHammersInbox — the one place to tell Hammer about schedule changes
 * (spec: docs/wic/adaptive-phases-and-schedule-v1.md §2). Eight big buttons,
 * three taps at most, no typing needed. "Ask Hammer" takes the same thing in
 * plain words or voice and asks before saving.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, CalendarX2, CalendarCheck, Trophy, Flag, Dumbbell, HeartPulse, PauseCircle,
  Star, Target, StickyNote, Plane, PlayCircle, Mic, Undo2, ArrowLeft, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { getTodayDate, getLocalDateString, parseLocalDateString } from "@/utils/dateUtils";
import {
  TIMELINE_TAGS, canUndo, describeEntry, isoShift,
  type TimelineFilterTag, type TimelineTag,
} from "../../../supabase/functions/_shared/wic/schedule/timeline";
import { parseScheduleRequest, FACE_LABEL, type EntryDraft } from "@/lib/hammer/tellHammers/parse";
import { REPORT_INJURY_REGIONS } from "@/lib/hammer/injury/reportInjury";

export const TAG_STYLE: Record<TimelineTag, { label: string; icon: typeof CalendarDays; tone: string }> = {
  SEASON: { label: "Season", icon: Flag, tone: "bg-primary/15 text-primary border-primary/30" },
  GAME: { label: "Game", icon: CalendarCheck, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  TOURNAMENT: { label: "Tournament", icon: Trophy, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  PRACTICE: { label: "Practice", icon: Dumbbell, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  CANCELLED: { label: "Cancelled", icon: CalendarX2, tone: "bg-muted text-muted-foreground border-border" },
  PAIN: { label: "Pain", icon: HeartPulse, tone: "bg-destructive/15 text-destructive border-destructive/30" },
  HOLD: { label: "Break", icon: PauseCircle, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  EVENT: { label: "Big event", icon: Star, tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  GOAL: { label: "Goal", icon: Target, tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
  NOTE: { label: "Note", icon: StickyNote, tone: "bg-secondary text-secondary-foreground border-border" },
  RESUME: { label: "Back to normal", icon: PlayCircle, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
};

type Flow = null | "games" | "season" | "cancelled" | "pain" | "break" | "event" | "travel" | "ask";

const BUTTONS: Array<{ flow: Exclude<Flow, null | "ask"> | "resume"; label: string; icon: typeof CalendarDays; tag: TimelineTag }> = [
  { flow: "games", label: "I have games", icon: CalendarCheck, tag: "GAME" },
  { flow: "season", label: "My season starts / ends", icon: Flag, tag: "SEASON" },
  { flow: "cancelled", label: "Games got cancelled", icon: CalendarX2, tag: "CANCELLED" },
  { flow: "pain", label: "Something hurts", icon: HeartPulse, tag: "PAIN" },
  { flow: "break", label: "I need a break", icon: PauseCircle, tag: "HOLD" },
  { flow: "event", label: "Big event coming", icon: Star, tag: "EVENT" },
  { flow: "travel", label: "I'm travelling", icon: Plane, tag: "HOLD" },
  { flow: "resume", label: "Back to normal", icon: PlayCircle, tag: "RESUME" },
];

const FACES = [
  { key: "little", emoji: "🙂" },
  { key: "lot", emoji: "😣" },
  { key: "cant", emoji: "😭" },
] as const;

function draft(tag: TimelineTag, start: string, end = start, payload: Record<string, unknown> = {}, dates: string[] | null = null): EntryDraft {
  return { tag, start_date: start, end_date: end < start ? start : end, dates, payload };
}

export function TellHammersInbox() {
  const tl = useScheduleTimeline();
  const { updateSeasonStatus } = useSeasonStatus();
  const today = getTodayDate();
  const [flow, setFlow] = useState<Flow>(null);
  const [busy, setBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ id: string; text: string } | null>(null);
  const [picked, setPicked] = useState<Date[]>([]);
  const [seasonWhich, setSeasonWhich] = useState<"starts" | "ends" | null>(null);
  const [eventKind, setEventKind] = useState<string | null>(null);
  const [region, setRegion] = useState<{ key: string; label: string } | null>(null);
  const [filter, setFilter] = useState<TimelineFilterTag | null>(null);
  const [askText, setAskText] = useState("");
  const [askDraft, setAskDraft] = useState<EntryDraft | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const reset = () => {
    setFlow(null);
    setPicked([]);
    setSeasonWhich(null);
    setEventKind(null);
    setRegion(null);
    setAskDraft(null);
    setAskError(null);
  };

  async function commit(d: EntryDraft, source: "inbox" | "ask_hammer" = "inbox") {
    if (busy) return;
    setBusy(true);
    try {
      if (d.tag === "SEASON") {
        updateSeasonStatus(
          d.payload.which === "ends"
            ? ({ in_season_end_date: d.start_date } as any)
            : ({ in_season_start_date: d.start_date } as any),
        );
      }
      const res = await tl.save(d, source);
      setLastMessage({ id: res.entry.id, text: res.message });
      toast.success(res.merged ? "You already told me this — I updated it." : "Saved", { description: res.message });
      reset();
      setAskText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  async function undo(id: string) {
    try {
      const ok = await tl.undo(id);
      if (ok) {
        toast.success("Undone");
        if (lastMessage?.id === id) setLastMessage(null);
      } else toast.error("That can only be undone within 24 hours.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't undo");
    }
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.message("Voice isn't available on this device — type it instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const said = ev.results?.[0]?.[0]?.transcript ?? "";
      setAskText(said);
      review(said);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function review(text = askText) {
    const r = parseScheduleRequest(text, today);
    if (r.ok) {
      setAskDraft(r.draft);
      setAskError(null);
    } else {
      setAskDraft(null);
      setAskError(r.reason);
    }
  }

  const visible = useMemo(
    () => tl.entries.filter((e) => !e.undone_at && (!filter || e.tag === filter || (filter === "HOLD" && e.tag === "RESUME"))),
    [tl.entries, filter],
  );

  if (!tl.enabled) return null;

  const dateStr = (d: Date) => getLocalDateString(d);
  const cal = (mode: "single" | "multiple", onPick: (dates: Date[]) => void) => (
    <Calendar
      mode={mode as any}
      selected={(mode === "single" ? picked[0] : picked) as any}
      onSelect={(v: any) => {
        const list = mode === "single" ? (v ? [v] : []) : (v ?? []);
        setPicked(list);
        onPick(list);
      }}
      className="rounded-md border mx-auto pointer-events-auto [&_button]:h-11 [&_button]:w-11 [&_button]:text-base"
    />
  );

  const Big = ({ children, onClick, testId }: { children: React.ReactNode; onClick: () => void; testId?: string }) => (
    <Button variant="outline" className="h-14 w-full text-base justify-start gap-3" onClick={onClick} disabled={busy} data-testid={testId}>
      {children}
    </Button>
  );

  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-card p-3" aria-label="Tell Hammer">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Tell Hammer</h3>
        {flow && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
      </div>

      {lastMessage && (
        <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm" role="status" data-testid="tell-hammers-result">
          <p>{lastMessage.text}</p>
          <Button size="sm" variant="outline" className="mt-2 h-10 gap-1" onClick={() => undo(lastMessage.id)}>
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
        </div>
      )}

      {flow === null && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {BUTTONS.map((b) => {
              const Icon = b.icon;
              return (
                <Button
                  key={b.flow}
                  variant="outline"
                  className="h-20 flex-col gap-1 whitespace-normal text-center text-sm leading-tight"
                  disabled={busy}
                  data-testid={`tell-${b.flow}`}
                  onClick={() => (b.flow === "resume" ? commit(draft("RESUME", today)) : setFlow(b.flow))}
                >
                  <Icon className="h-6 w-6" />
                  {b.label}
                </Button>
              );
            })}
          </div>
          <Button variant="secondary" className="h-12 w-full gap-2 text-base" onClick={() => setFlow("ask")} data-testid="tell-ask">
            <MessageCircle className="h-5 w-5" /> Ask Hammer — say it or type it
          </Button>
        </>
      )}

      {flow === "games" && (
        <div className="space-y-2">
          <p className="text-sm">Tap your game days.</p>
          {cal("multiple", () => undefined)}
          <Button
            className="h-12 w-full text-base"
            disabled={!picked.length || busy}
            data-testid="tell-save"
            onClick={() => {
              const ds = picked.map(dateStr).sort();
              commit(draft("GAME", ds[0], ds[ds.length - 1], {}, ds));
            }}
          >
            Save {picked.length > 1 ? `${picked.length} games` : "game"}
          </Button>
        </div>
      )}

      {flow === "season" && !seasonWhich && (
        <div className="grid grid-cols-2 gap-2">
          <Big onClick={() => setSeasonWhich("starts")}>Season starts</Big>
          <Big onClick={() => setSeasonWhich("ends")}>Season ends</Big>
        </div>
      )}
      {flow === "season" && seasonWhich && (
        <div className="space-y-2">
          <p className="text-sm">Tap the day your season {seasonWhich === "ends" ? "ends" : "starts"}.</p>
          {cal("single", (l) => l[0] && commit(draft("SEASON", dateStr(l[0]), dateStr(l[0]), { which: seasonWhich })))}
        </div>
      )}

      {flow === "cancelled" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Big onClick={() => commit(draft("CANCELLED", today))}>Today</Big>
            <Big onClick={() => commit(draft("CANCELLED", today, isoShift(today, 6)))}>This week</Big>
            <Big onClick={() => commit(draft("CANCELLED", today, isoShift(today, 13)))}>Next 2 weeks</Big>
            <Big onClick={() => commit(draft("CANCELLED", today, isoShift(today, 27)))}>Next 4 weeks</Big>
          </div>
          <p className="text-sm">Or tap the days:</p>
          {cal("multiple", () => undefined)}
          <Button
            className="h-12 w-full text-base"
            disabled={!picked.length || busy}
            onClick={() => {
              const ds = picked.map(dateStr).sort();
              commit(draft("CANCELLED", ds[0], ds[ds.length - 1], {}, ds));
            }}
          >
            Save
          </Button>
        </div>
      )}

      {flow === "pain" && !region && (
        <div className="space-y-2">
          <p className="text-sm">Where does it hurt?</p>
          <div className="grid grid-cols-3 gap-2">
            {REPORT_INJURY_REGIONS.map((r) => (
              <Button key={r.key} variant="outline" className="h-12 text-sm" onClick={() => setRegion(r)} data-testid={`pain-${r.key}`}>
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {flow === "pain" && region && (
        <div className="space-y-2">
          <p className="text-sm">How bad is your {region.label.toLowerCase()}?</p>
          <div className="grid grid-cols-3 gap-2">
            {FACES.map((f) => (
              <Button
                key={f.key}
                variant="outline"
                className="h-24 flex-col gap-1 text-sm"
                disabled={busy}
                data-testid={`face-${f.key}`}
                onClick={() =>
                  commit(draft("PAIN", today, today, { region: region.key, regionLabel: region.label, face: f.key, faceLabel: FACE_LABEL[f.key] }))
                }
              >
                <span className="text-3xl" aria-hidden>{f.emoji}</span>
                {FACE_LABEL[f.key]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {(flow === "break" || flow === "travel") && (
        <div className="space-y-2">
          <p className="text-sm">{flow === "travel" ? "How long are you away?" : "How long do you need?"}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: "Just today", n: 1 },
              { l: "3 days", n: 3 },
              { l: "1 week", n: 7 },
              { l: "2 weeks", n: 14 },
            ].map((o) => (
              <Big
                key={o.n}
                testId={`hold-${o.n}`}
                onClick={() => commit(draft("HOLD", today, isoShift(today, o.n - 1), { reason: flow === "travel" ? "travel" : "break" }))}
              >
                {o.l}
              </Big>
            ))}
          </div>
        </div>
      )}

      {flow === "event" && !eventKind && (
        <div className="grid grid-cols-2 gap-2">
          {["Combine", "Showcase", "Tryout", "Camp"].map((k) => (
            <Big key={k} onClick={() => setEventKind(k)}>{k}</Big>
          ))}
        </div>
      )}
      {flow === "event" && eventKind && (
        <div className="space-y-2">
          <p className="text-sm">Tap the day of the {eventKind.toLowerCase()}.</p>
          {cal("single", (l) => l[0] && commit(draft("EVENT", dateStr(l[0]), dateStr(l[0]), { label: eventKind, kind: eventKind.toLowerCase() })))}
        </div>
      )}

      {flow === "ask" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              rows={2}
              className="text-base"
              placeholder='e.g. "Games cancelled Oct 5 to 19"'
              data-testid="ask-text"
            />
            <Button variant={listening ? "default" : "outline"} className="h-auto w-14" onClick={startVoice} aria-label="Say it">
              <Mic className="h-5 w-5" />
            </Button>
          </div>
          <Button className="h-12 w-full text-base" onClick={() => review()} disabled={!askText.trim()} data-testid="ask-review">
            Check it
          </Button>
          {askError && <p className="text-sm text-muted-foreground">{askError}</p>}
          {askDraft && (
            <div className="rounded-md border p-3 space-y-2" data-testid="ask-confirm">
              <p className="text-sm">I'll save: <strong>{describeEntry(askDraft)}</strong>. Is that right?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button className="h-12" onClick={() => commit(askDraft, "ask_hammer")} disabled={busy} data-testid="ask-yes">Yes, save</Button>
                <Button variant="outline" className="h-12" onClick={() => setAskDraft(null)}>No</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {flow === null && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={`rounded-full border px-3 py-1.5 text-xs ${filter === null ? "bg-foreground text-background" : ""}`}
            >
              All
            </button>
            {TIMELINE_TAGS.map((t) => {
              const s = TAG_STYLE[t];
              const Icon = s.icon;
              return (
                <button
                  key={t}
                  type="button"
                  data-testid={`chip-${t}`}
                  onClick={() => setFilter(filter === t ? null : t)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${s.tone} ${filter === t ? "ring-2 ring-ring" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {s.label}
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {visible.slice(0, 20).map((e) => {
                const s = TAG_STYLE[e.tag];
                const Icon = s.icon;
                return (
                  <li key={e.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${s.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">{describeEntry(e)}</span>
                    {canUndo(e) && (
                      <Button size="sm" variant="ghost" className="h-9 gap-1" onClick={() => undo(e.id)}>
                        <Undo2 className="h-4 w-4" /> Undo
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default TellHammersInbox;
// Exposed for tests.
export { BUTTONS as TELL_HAMMERS_BUTTONS, parseLocalDateString as _parse };
