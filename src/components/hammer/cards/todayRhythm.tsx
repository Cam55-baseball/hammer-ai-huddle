/**
 * Today rhythm — presentation only. Pocket cards report their own progress
 * here so the plan can show one "Next up", a day progress ring and the
 * prepare → prime → explode → perform → recover story. Reads progress the
 * cards already compute; never authors, reorders or changes training.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type Stage = "prepare" | "prime" | "explode" | "perform" | "recover";
export const STAGES: ReadonlyArray<{ id: Stage; label: string }> = [
  { id: "prepare", label: "Prepare" },
  { id: "prime", label: "Prime" },
  { id: "explode", label: "Explode" },
  { id: "perform", label: "Perform" },
  { id: "recover", label: "Recover" },
];

export type Domain = "speed" | "bat" | "lift" | "throw" | "conditioning" | "recovery" | "prepare" | "skill";

export function domainOf(category: string): Domain {
  const c = category.toLowerCase();
  if (c.includes("bat")) return "bat";
  if (c.includes("speed") || c.includes("base")) return "speed";
  if (c.includes("lift")) return "lift";
  if (c.includes("throw") || c.includes("pitch") || c.includes("windmill")) return "throw";
  if (c.includes("condition")) return "conditioning";
  if (c.includes("recover") || c.includes("sleep") || c.includes("fuel") || c.includes("regen")) return "recovery";
  if (c.includes("warm") || c.includes("mobility")) return "prepare";
  return "skill";
}

export function stageOf(category: string): Stage {
  switch (domainOf(category)) {
    case "prepare": return "prepare";
    case "speed": return "prime";
    case "bat": case "lift": return "explode";
    case "recovery": return "recover";
    default: return "perform";
  }
}

interface Entry {
  id: string; category: string; heading: string; seq: number;
  progress: { done: number; total: number } | null;
  open: () => void;
}
interface Ctx {
  register: (e: Omit<Entry, "seq">) => void;
  unregister: (id: string) => void;
  nextId: string | null;
}
const RhythmCtx = createContext<Ctx | null>(null);
const ViewCtx = createContext<{ entries: Entry[]; nextId: string | null; planDate: string } | null>(null);

export function TodayRhythmProvider({ planDate, children }: { readonly planDate: string; readonly children: ReactNode }) {
  const map = useRef(new Map<string, Entry>());
  const seq = useRef(0);
  const [version, setVersion] = useState(0);
  const register = useCallback((e: Omit<Entry, "seq">) => {
    const prev = map.current.get(e.id);
    const same = prev && prev.heading === e.heading && prev.progress?.done === e.progress?.done && prev.progress?.total === e.progress?.total;
    map.current.set(e.id, { ...e, seq: prev?.seq ?? seq.current++ });
    if (!same) setVersion((v) => v + 1);
  }, []);
  const unregister = useCallback((id: string) => { if (map.current.delete(id)) setVersion((v) => v + 1); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => [...map.current.values()].sort((a, b) => a.seq - b.seq), [version]);
  const nextId = entries.find((e) => e.progress && e.progress.total > 0 && e.progress.done < e.progress.total)?.id ?? null;
  const ctx = useMemo(() => ({ register, unregister, nextId }), [register, unregister, nextId]);
  const view = useMemo(() => ({ entries, nextId, planDate }), [entries, nextId, planDate]);
  return <RhythmCtx.Provider value={ctx}><ViewCtx.Provider value={view}>{children}</ViewCtx.Provider></RhythmCtx.Provider>;
}

/** Called by each pocket card. Returns its place in the day's rhythm. */
export function useRhythm(e: Omit<Entry, "seq">, active: boolean): "next" | "done" | "rest" {
  const ctx = useContext(RhythmCtx);
  const openRef = useRef(e.open);
  openRef.current = e.open;
  const { id, category, heading } = e;
  const done = e.progress?.done ?? null, total = e.progress?.total ?? null;
  useEffect(() => {
    if (!ctx || !active) return;
    ctx.register({ id, category, heading, progress: total == null ? null : { done: done ?? 0, total }, open: () => openRef.current() });
  }, [ctx, active, id, category, heading, done, total]);
  useEffect(() => () => ctx?.unregister(id), [ctx, id]);
  if (total != null && total > 0 && (done ?? 0) >= total) return "done";
  return ctx?.nextId === id ? "next" : "rest";
}

/* ---------- visuals ---------- */

export function ProgressRing({ value, size = 64, stroke = 6, children }: { readonly value: number; readonly size?: number; readonly stroke?: number; readonly children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Small line motif per domain — geometry, not clip art. */
export function DomainGlyph({ domain, className = "" }: { readonly domain: Domain; readonly className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {domain === "speed" && <><path {...p} d="M3 8h9M5 12h12M3 16h9" /><path {...p} d="M17 7l4 5-4 5" /></>}
      {domain === "bat" && <><path {...p} d="M12 3a9 9 0 1 1-8.5 6" /><path {...p} d="M3.5 4v5h5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></>}
      {domain === "lift" && <><path {...p} d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></>}
      {domain === "throw" && <><path {...p} d="M3 18C7 7 15 5 21 8" strokeDasharray="2 3" /><circle cx="21" cy="8" r="2" fill="currentColor" /></>}
      {domain === "conditioning" && <><path {...p} d="M4 20V14M9 20V10M14 20V12M19 20V6" /></>}
      {domain === "recovery" && <><path {...p} d="M3 12c3-4 6 4 9 0s6 4 9 0" /><path {...p} d="M3 17c3-4 6 4 9 0s6 4 9 0" opacity=".5" /></>}
      {domain === "prepare" && <><path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle {...p} cx="12" cy="12" r="4" /></>}
      {domain === "skill" && <><path {...p} d="M12 3l9 9-9 9-9-9z" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></>}
    </svg>
  );
}

const DAY_DONE_KEY = "hm_day_complete_seen";

/** The day's command center: progress ring, Next up, and the session story. */
export function DayCommandCenter() {
  const view = useContext(ViewCtx);
  const tracked = (view?.entries ?? []).filter((e) => e.progress && e.progress.total > 0);
  const done = tracked.reduce((s, e) => s + (e.progress!.done >= e.progress!.total ? 1 : 0), 0);
  const items = tracked.reduce((s, e) => s + Math.min(e.progress!.done, e.progress!.total), 0);
  const totalItems = tracked.reduce((s, e) => s + e.progress!.total, 0);
  const next = view?.entries.find((e) => e.id === view.nextId) ?? null;
  const dayDone = tracked.length > 0 && done === tracked.length;
  const planDate = view?.planDate ?? "";

  useEffect(() => {
    if (!dayDone || !planDate) return;
    try {
      if (localStorage.getItem(DAY_DONE_KEY) === planDate) return;
      localStorage.setItem(DAY_DONE_KEY, planDate);
    } catch { /* storage unavailable */ }
    toast.success("Day complete. Every card is done — recover well.");
  }, [dayDone, planDate]);

  if (!view || view.entries.length === 0) return null;
  const stagesToday = STAGES.filter((s) => view.entries.some((e) => stageOf(e.category) === s.id));
  const currentStage = next ? stageOf(next.category) : null;
  const stageDone = (s: Stage) => {
    const es = tracked.filter((e) => stageOf(e.category) === s);
    return es.length > 0 && es.every((e) => e.progress!.done >= e.progress!.total);
  };
  const pct = totalItems ? items / totalItems : 0;

  return (
    <section data-day-command className="overflow-hidden rounded-xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
      <div className="flex items-center gap-4 p-4">
        <ProgressRing value={pct} size={68} stroke={6}>
          {dayDone
            ? <Check className="h-7 w-7 text-primary animate-in zoom-in-50 duration-300 motion-reduce:animate-none" aria-label="Day complete" />
            : <span className="text-base font-bold tabular-nums text-foreground">{Math.round(pct * 100)}<span className="text-[10px] font-semibold text-muted-foreground">%</span></span>}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {dayDone ? "Day complete" : "Today"} · <span className="tabular-nums">{done}/{tracked.length}</span> cards
          </p>
          {next ? (
            <>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Next up</p>
              <p className="line-clamp-2 text-lg font-bold leading-tight text-foreground">{next.heading}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-bold leading-tight text-foreground">{dayDone ? "All work done. Recover well." : "Your work for today"}</p>
          )}
        </div>
      </div>
      {next && (
        <div className="px-4 pb-3">
          <Button data-next-up-open className="h-11 w-full justify-between text-sm font-semibold active:scale-[0.98] transition-transform motion-reduce:transition-none" onClick={next.open}>
            Open {next.heading.split(" — ")[0]}<ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {stagesToday.length > 1 && (
        <ol className="flex border-t border-border" aria-label="Session flow">
          {stagesToday.map((s) => {
            const isNow = s.id === currentStage, isDone = stageDone(s.id);
            return (
              <li key={s.id} data-stage={s.id} data-state={isNow ? "now" : isDone ? "done" : "later"}
                className={`relative min-w-0 flex-1 whitespace-nowrap py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 motion-reduce:transition-none ${isNow ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground font-medium"}`}>
                {isDone && <Check className="mr-0.5 inline h-3 w-3 -translate-y-px" aria-hidden />}{s.label}
                <span className={`absolute inset-x-2 top-0 h-0.5 rounded-full transition-colors duration-300 motion-reduce:transition-none ${isNow ? "bg-primary" : isDone ? "bg-foreground/30" : "bg-transparent"}`} aria-hidden />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
