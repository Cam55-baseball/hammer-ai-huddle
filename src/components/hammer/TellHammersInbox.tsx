/** One athlete-owned entry surface for Today and both check-ins. */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarCheck, CalendarX2, ChevronDown, ChevronUp, Flag, HeartPulse, PauseCircle, Plane, PlayCircle, Star, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useScheduleTimeline } from "@/hooks/useScheduleTimeline";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { getTodayDate, getLocalDateString } from "@/utils/dateUtils";
import { canUndo, describeEntry, isoShift } from "../../../supabase/functions/_shared/wic/schedule/timeline";
import { parseScheduleRequest, FACE_LABEL, extractDates, type EntryDraft } from "@/lib/hammer/tellHammers/parse";
import { REPORT_INJURY_REGIONS } from "@/lib/hammer/injury/reportInjury";

type Flow = "games" | "season" | "cancelled" | "pain" | "break" | "event" | "travel" | "resume" | "ask";
const BUTTONS = [
  { flow: "games", label: "I have games", icon: CalendarCheck },
  { flow: "season", label: "Season starts or ends", icon: Flag },
  { flow: "cancelled", label: "Games cancelled", icon: CalendarX2 },
  { flow: "pain", label: "Something hurts", icon: HeartPulse },
  { flow: "break", label: "I need a break", icon: PauseCircle },
  { flow: "event", label: "Big event", icon: Star },
  { flow: "travel", label: "Travelling", icon: Plane },
  { flow: "resume", label: "Back to normal", icon: PlayCircle },
] as const;
const FACES = [{ key: "little", emoji: "🙂" }, { key: "lot", emoji: "😣" }, { key: "cant", emoji: "😭" }] as const;
const RED_FLAG = /\b(numb(?:ness)?|tingl(?:e|es|ing)|popp?(?:ed|ing)?|can't move|cannot move|unable to move|can't straighten|cannot straighten|unable to straighten)\b/i;
const NOTE_MESSAGE = "Saved your note — tap a choice or give me dates if you want the plan to change.";
function draft(tag: EntryDraft["tag"], start: string, end = start, payload: Record<string, unknown> = {}, dates: string[] | null = null): EntryDraft {
  return { tag, start_date: start, end_date: end < start ? start : end, dates, payload };
}

export function TellHammersInbox({ checkIn = false, onDone }: { checkIn?: boolean; onDone?: () => void }) {
  const { user } = useAuth();
  const tl = useScheduleTimeline();
  const { updateSeasonStatus } = useSeasonStatus();
  const today = getTodayDate();
  const storageKey = `hammer:tell-open:${user?.id ?? "guest"}`;
  const [open, setOpen] = useState(checkIn);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Date[]>([]);
  const [which, setWhich] = useState<"starts" | "ends" | null>(null);
  const [eventKind, setEventKind] = useState<string | null>(null);
  const [region, setRegion] = useState<(typeof REPORT_INJURY_REGIONS)[number] | null>(null);
  const [pending, setPending] = useState<EntryDraft | null>(null);
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState<EntryDraft | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [sent, setSent] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    if (checkIn) return;
    try { setOpen(localStorage.getItem(storageKey) === "true"); } catch { /* private browsing */ }
  }, [storageKey, checkIn]);
  const todayEntries = useMemo(() => tl.entries.filter(e => !e.undone_at && e.created_at?.slice(0, 10) === today), [tl.entries, today]);
  if (!tl.enabled) return null;
  const toggle = (value: boolean) => {
    setOpen(value);
    if (!value) reset();
    try { localStorage.setItem(storageKey, String(value)); } catch { /* private browsing */ }
  };
  function reset() {
    setFlow(null); setPending(null); setPicked([]); setWhich(null); setEventKind(null); setRegion(null); setText(""); setConfirm(null);
  }
  function enter(next: Flow) { reset(); setLastMessage(null); setFlow(next); if (next === "resume") setPending(draft("RESUME", today)); }
  async function commit(d: EntryDraft) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await tl.save(d, "inbox");
      if (d.tag === "SEASON") updateSeasonStatus(d.payload.which === "ends" ? { in_season_end_date: d.start_date } as any : { in_season_start_date: d.start_date } as any);
      setLastMessage(d.tag === "NOTE" && d.payload.kind === "free_text" ? NOTE_MESSAGE : res.message);
      setSent(previous => [{ id: res.entry.id, label: describeEntry(res.entry) }, ...previous.filter(item => item.id !== res.entry.id)]);
      if (d.tag === "PAIN" && RED_FLAG.test(String(d.payload.text ?? ""))) toast.error("Stop and get it checked by a trainer or doctor.");
      reset();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save that"); }
    finally { setBusy(false); }
  }
  async function undo(id: string) {
    try {
      if (await tl.undo(id)) { setSent(s => s.filter(e => e.id !== id)); toast.success("Undone"); }
      else toast.error("That can only be undone within 24 hours.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't undo"); }
  }
  function prepare() {
    const words = text.trim();
    if (!words && pending) { void commit(pending); return; }
    if (!words) return;
    // A structured choice stays authoritative unless the words actually contain a readable date/length.
    const prefix: Partial<Record<Flow, string>> = { break: "break ", travel: "travel ", games: "games ", cancelled: "games cancelled ", season: `season ${which ?? "starts"} `, event: `${eventKind ?? "showcase"} ` };
    const parsed = parseScheduleRequest(`${prefix[flow ?? "ask"] ?? ""}${words}`, today);
    const hasTime = extractDates(words, today).length > 0 || /\b(\d+|one|two|three|four|a)\s*(days?|weeks?)\b/i.test(words);
    if (flow === "pain" && pending) { void commit({ ...pending, payload: { ...pending.payload, text: words } }); return; }
    if (hasTime && parsed.ok && parsed.draft.tag !== "NOTE" && parsed.draft.tag !== "GOAL") {
      // Never let a different category in free text silently replace the selected option.
      const expected: Partial<Record<Flow, EntryDraft["tag"]>> = { break: "HOLD", travel: "HOLD", games: "GAME", cancelled: "CANCELLED", season: "SEASON", event: "EVENT" };
      if (!flow || flow === "ask" || parsed.draft.tag === expected[flow]) {
        setConfirm({ ...parsed.draft, payload: { ...parsed.draft.payload, text: words } }); return;
      }
    }
    // An unrecognised sentence must never silently author a plan change.
    void commit(draft("NOTE", today, today, { kind: "free_text", text: words }));
  }
  const pickCalendar = (multiple: boolean) => <Calendar mode={multiple ? "multiple" : "single"} selected={(multiple ? picked : picked[0]) as any}
    onSelect={(value: any) => setPicked(multiple ? (value ?? []) : (value ? [value] : []))}
    className="mx-auto rounded-md border pointer-events-auto [&_button]:h-11 [&_button]:w-11" />;
  const choice = (label: string, value: EntryDraft, testId?: string) => <Button key={label} variant="outline" className="h-12 whitespace-normal" data-testid={testId} onClick={() => setPending(value)}>{label}</Button>;
  return <section className="rounded-md border border-border bg-card p-3 space-y-3" aria-label={checkIn ? "Anything change?" : "Tell Hammer"}>
    {checkIn ? <div className="flex items-center justify-between"><h3 className="font-semibold">Anything change?</h3>{flow && <Button variant="ghost" onClick={reset}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>}</div> :
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="h-11 flex-1 justify-between px-1 font-semibold" aria-expanded={open} onClick={() => toggle(!open)}>
          Tell Hammer {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
        {open && <Button size="icon" variant="ghost" aria-label="Close Tell Hammer" onClick={() => toggle(false)}><X className="h-4 w-4" /></Button>}
      </div>}
    {(open || checkIn) && <div className="space-y-3">
      {!checkIn && flow && <Button variant="ghost" onClick={reset}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>}
      {lastMessage && <div role="status" data-testid="tell-hammers-result" className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm"><strong>Got it — Hammer has it</strong><p>{lastMessage}</p></div>}
      {!flow && <>
        <div className="grid grid-cols-2 gap-2">{BUTTONS.map(({flow: f, label, icon: Icon}) => <Button key={f} variant="outline" className="h-20 flex-col gap-1 whitespace-normal text-center text-sm" data-testid={`tell-${f}`} onClick={() => enter(f)}><Icon className="h-5 w-5 shrink-0" />{label}</Button>)}</div>
        <Button variant="outline" className="w-full" data-testid="tell-ask" onClick={() => enter("ask")}>Tell Hammer in your words</Button>
        {checkIn && <Button className="w-full" data-testid="chip-nope" onClick={onDone}>Done</Button>}
      </>}
      {flow === "games" && <><p className="text-sm">Tap your game days.</p>{pickCalendar(true)}<Button disabled={!picked.length} onClick={() => { const days = picked.map(getLocalDateString).sort(); setPending(draft("GAME", days[0], days[days.length - 1], {}, days)); }}>Use these days</Button></>}
      {flow === "season" && <>{!which ? <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setWhich("starts")}>Season starts</Button><Button variant="outline" onClick={() => setWhich("ends")}>Season ends</Button></div> : <><p className="text-sm">Tap the day your season {which}.</p>{pickCalendar(false)}<Button disabled={!picked.length} onClick={() => setPending(draft("SEASON", getLocalDateString(picked[0]), getLocalDateString(picked[0]), { which }))}>Use this day</Button></>}</>}
      {flow === "cancelled" && <><div className="grid grid-cols-2 gap-2">{[1,7,14,28].map((n) => choice(n === 1 ? "Today" : n === 7 ? "This week" : n === 14 ? "Next 2 weeks" : "Next 4 weeks", draft("CANCELLED", today, isoShift(today,n - 1))))}</div><p className="text-sm">Or tap the days:</p>{pickCalendar(true)}<Button disabled={!picked.length} onClick={() => { const days = picked.map(getLocalDateString).sort(); setPending(draft("CANCELLED",days[0],days[days.length-1],{},days)); }}>Use these days</Button></>}
      {flow === "pain" && <>{!region ? <><p className="text-sm">Where does it hurt?</p><div className="grid grid-cols-3 gap-2">{REPORT_INJURY_REGIONS.map(r => <Button key={r.key} variant="outline" className="h-12 text-xs" data-testid={`pain-${r.key}`} onClick={() => setRegion(r)}>{r.label}</Button>)}</div></> : <><p className="text-sm">How bad is your {region.label.toLowerCase()}?</p><div className="grid grid-cols-3 gap-2">{FACES.map(f => <Button key={f.key} variant="outline" className="h-20 flex-col" data-testid={`face-${f.key}`} onClick={() => setPending(draft("PAIN",today,today,{ region: region.key, regionLabel: region.label, face: f.key, faceLabel: FACE_LABEL[f.key] }))}><span className="text-2xl">{f.emoji}</span>{FACE_LABEL[f.key]}</Button>)}</div></> }</>}
      {(flow === "break" || flow === "travel") && <><p className="text-sm">{flow === "travel" ? "How long are you away?" : "How long do you need?"}</p><div className="grid grid-cols-2 gap-2">{(flow === "break" ? [1,3,7] : [1,3,7,14]).map(n => choice(n === 1 ? "Just today" : n === 7 ? "1 week" : `${n} days`, draft("HOLD",today,isoShift(today,n-1),{reason: flow === "travel" ? "travel" : "break"}),`hold-${n}`))}</div></>}
      {flow === "event" && <>{!eventKind ? <div className="grid grid-cols-2 gap-2">{["Combine","Showcase","Tryout","Camp"].map(k => <Button key={k} variant="outline" onClick={() => setEventKind(k)}>{k}</Button>)}</div> : <><p className="text-sm">Tap the day of the {eventKind.toLowerCase()}.</p>{pickCalendar(false)}<Button disabled={!picked.length} onClick={() => setPending(draft("EVENT",getLocalDateString(picked[0]),getLocalDateString(picked[0]),{label:eventKind,kind:eventKind.toLowerCase()}))}>Use this day</Button></>}</>}
      {flow && <div className="space-y-2">
        {pending && <p className="text-sm font-medium">{describeEntry(pending)}</p>}
        <form onSubmit={e => { e.preventDefault(); prepare(); }} className="space-y-2">
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={2} data-testid="entry-text"
            aria-label={flow === "pain" ? "Tell Hammer more — where exactly, when it started" : "Something else"}
            placeholder={flow === "pain" ? "Tell Hammer more — where exactly, when it started" : flow === "ask" ? "e.g. Games cancelled Oct 5 to 19" : "Something else…"}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); prepare(); } }} />
          <Button type="submit" className="w-full" disabled={busy || (!pending && !text.trim())} data-testid="entry-send">Send</Button>
        </form>
        {confirm && <div className="rounded-md border p-3 space-y-2" data-testid="ask-confirm"><p>I'll save: <strong>{describeEntry(confirm)}</strong>. Is that right?</p><div className="flex gap-2"><Button data-testid="ask-yes" disabled={busy} onClick={() => void commit(confirm)}>Yes, save</Button><Button variant="outline" onClick={() => setConfirm(null)}>Back</Button></div></div>}
        {flow === "pain" && RED_FLAG.test(text) && <p role="alert" className="text-sm text-destructive">Stop and get it checked by a trainer or doctor.</p>}
      </div>}
      <div className="border-t pt-3 space-y-2"><h4 className="text-sm font-semibold">Sent today</h4>
        {[...sent, ...todayEntries.filter(e => !sent.some(s => s.id === e.id)).map(e => ({id:e.id,label:describeEntry(e)}))].map(e => <div key={e.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-words">{e.label}</span><Button size="sm" variant="ghost" aria-label={`Undo ${e.label}`} onClick={() => void undo(e.id)}><Undo2 className="h-4 w-4" /> Undo</Button></div>)}
      </div>
    </div>}
  </section>;
}
export default TellHammersInbox;
export { BUTTONS as TELL_HAMMERS_BUTTONS };
