/** Dev-only harness: Player week day boxes with long names, before vs. after (Owner Nov 6 r3). */
import { useSearchParams } from "react-router-dom";
import { ClampText, StatusChip } from "@/components/coach/CoachPlayerWeek";

const cards = [
  { title: "Full-body warm-up with progressive sprint prep and arm-care ladder for position players", status: "Skipped (allowed)", acts: ["Lateral lunge with overhead reach and thoracic rotation hold", "A-skip into dribble build-ups at 60, 75 and 90 percent"] },
  { title: "Defense — backhand footwork, short-hop picks and throwing errors fix", status: "Partly done", acts: ["Backhand short-hop to crow-hop throw at full intent from deep shortstop hole"] },
];
export default function PlayerWeekLayoutHarness() {
  const before = useSearchParams()[0].get("v") === "before";
  return <main className="mx-auto max-w-[390px] space-y-2 bg-background p-4">
    <h2 className="text-lg font-semibold">Player week</h2>
    {["Mon 2", "Tue 3"].map(d => <div key={d} className={before ? "rounded-md border p-2" : "min-w-0 min-h-24 overflow-hidden rounded-md border p-2"}>
      <p className="mb-2 rounded bg-primary px-2 py-1 text-center text-sm text-primary-foreground">{d}</p>
      <ul className="space-y-3">{cards.map(c => before
        ? <li key={c.title} className="text-xs whitespace-nowrap"><p className="font-semibold">{c.title}</p><p>{c.status}</p>{c.acts.map(a => <p key={a}>{a} · Not done</p>)}</li>
        : <li key={c.title} className="min-w-0 space-y-1 rounded border border-border p-2 text-xs"><ClampText text={c.title} className="font-semibold" /><StatusChip label={c.status} />{c.acts.map(a => <div key={a} className="space-y-0.5"><ClampText text={a} /><StatusChip label="Not done" /></div>)}</li>)}</ul>
    </div>)}
  </main>;
}
