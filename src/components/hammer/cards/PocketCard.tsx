/**
 * PocketCard — Round 8 Step 1 card shell (screen only; never changes the plan).
 *
 * On the plan, a card shows as a tile with a clear heading. Tapping opens a
 * full "pocket page". "Start" locks in: the page covers everything else and
 * only the card scrolls. Every opened card ends with Save & Exit, Exit without
 * saving (confirmed) and the owner's disclaimer. The open card is remembered
 * on this device for the plan date, so a reload or app close reopens it.
 */
import { ReportProblemButton } from "@/components/support/ReportProblemButton";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, ExternalLink, Lock, LogOut, X } from "lucide-react";
import { DomainGlyph, domainOf, useRhythm } from "./todayRhythm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PracticeLog } from "@/components/hammer/logging/ExtraLogs";
import { createContext, useContext } from "react";

const PocketDetailsContext = createContext(false);
export const usePocketDetails = () => useContext(PocketDetailsContext);

export const CARD_DISCLAIMER =
  "Hammer's Modality is not responsible for any injury that may occur during exercises. There are no guarantees in results. Always consult with a qualified healthcare professional before beginning any exercise program. Listen to your body and stop immediately if you experience pain.";

const OPEN_KEY = "hm_pocket_open";
const INTRO_KEY = "hm_pocket_intro_seen";
const CELEBRATED_KEY = "hm_pocket_celebrated";

function readSet(key: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function addToSet(key: string, val: string) {
  try { const v = readSet(key); if (!v.includes(val)) localStorage.setItem(key, JSON.stringify([...v, val].slice(-200))); } catch { /* storage unavailable */ }
}

export function readOpenPocket(planDate: string): string | null {
  try {
    const raw = sessionStorage.getItem(OPEN_KEY) ?? localStorage.getItem(OPEN_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { id?: string; date?: string };
    return v.date === planDate && v.id ? v.id : null;
  } catch { return null; }
}
function writeOpenPocket(id: string | null, planDate: string) {
  try {
    if (id) {
      const v = JSON.stringify({ id, date: planDate });
      localStorage.setItem(OPEN_KEY, v);
    } else localStorage.removeItem(OPEN_KEY);
  } catch { /* storage unavailable */ }
}

interface Props {
  readonly id: string;
  readonly category: string;          // e.g. "Lift"
  readonly focus?: string | null;     // e.g. "Lower Strength"
  readonly tone: string;              // semantic token class for the badge/accent
  readonly planDate: string;
  readonly prescribed: boolean;
  readonly countLabel?: string | null; // e.g. "6 exercises"
  readonly notPrescribedNote?: ReactNode;
  readonly children: (opts: { pocket: true }) => ReactNode;
  /** Done / total for today's card (Done or Cut short count as done). */
  readonly progress?: { done: number; total: number } | null;
  /** One-time intro, shown the first time this card type is opened on this device. */
  readonly intro?: string | null;
  /** Link card: the page shows these steps and a button to the linked screen. */
  readonly link?: { route: string; label: string; steps: ReadonlyArray<string> } | null;
  readonly onNavigate?: (route: string) => void;
  readonly practiceLogging?: boolean;
}

export function PocketCard({ id, category, focus, tone, planDate, prescribed, countLabel, notPrescribedNote, children, progress, intro, link, onNavigate, practiceLogging = false }: Props) {
  const [showIntro, setShowIntro] = useState(false);
  const allDone = !!progress && progress.total > 0 && progress.done >= progress.total;
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!allDone) return;
    const key = `${id}:${planDate}`;
    if (readSet(CELEBRATED_KEY).includes(key)) return;
    addToSet(CELEBRATED_KEY, key);
    setCelebrate(true);
    toast.success(`${category} done. Nice work!`);
    const t = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(t);
  }, [allDone, id, planDate, category]);
  const [open, setOpen] = useState(() => prescribed && readOpenPocket(planDate) === id);
  const [locked, setLocked] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const heading = focus && focus.trim().toLowerCase() !== category.toLowerCase() ? `${category} — ${focus}` : category;

  useEffect(() => {
    if (prescribed && readOpenPocket(planDate) === id) setOpen(true);
  }, [prescribed, planDate, id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function openPocket() {
    if (!prescribed) return;
    setOpen(true);
    writeOpenPocket(id, planDate);
    if (intro && !readSet(INTRO_KEY).includes(id)) setShowIntro(true);
  }
  function dismissIntro() { addToSet(INTRO_KEY, id); setShowIntro(false); }
  function close(saved: boolean) {
    setOpen(false);
    setLocked(false);
    writeOpenPocket(null, planDate);
    if (saved) toast.success("Saved. Your logged work is kept.");
  }

  const rhythm = useRhythm({ id, category, heading, progress: progress ?? null, open: openPocket }, prescribed);
  const domain = domainOf(category);
  if (!prescribed) return null;
  const tileBase = "group h-auto w-full justify-start whitespace-normal rounded-xl border text-left transition-[transform,box-shadow,background-color,padding] duration-200 ease-out active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none";
  const tileByRhythm = rhythm === "next"
    ? "border-primary bg-card p-4 shadow-md ring-1 ring-primary/30"
    : rhythm === "done"
      ? "border-border bg-muted/40 px-3 py-2"
      : "border-border bg-card p-3 hover:shadow-sm";
  const pct = progress && progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;
  return (
    <>
      <Button variant="ghost"
        type="button"
        onClick={openPocket}
        disabled={!prescribed}
        data-pocket-tile={id}
        data-rhythm={rhythm}
        className={`${tileBase} ${tileByRhythm} ${celebrate ? "hm-card-complete" : ""} min-h-[44px]`}
      >
        <div className="flex w-full items-center gap-3">
          {rhythm === "done" ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={celebrate ? "hm-check-draw" : ""} /></svg>
            </span>
          ) : (
            <span className={`flex shrink-0 items-center justify-center rounded-lg ${rhythm === "next" ? "h-11 w-11 bg-primary text-primary-foreground" : "h-9 w-9 bg-muted text-foreground"}`} aria-hidden>
              <DomainGlyph domain={domain} className={rhythm === "next" ? "h-6 w-6" : "h-5 w-5"} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {rhythm === "next" && <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Next up</p>}
            <p className={`leading-snug ${rhythm === "next" ? "text-base font-bold text-foreground" : rhythm === "done" ? "text-sm font-medium text-muted-foreground" : "text-sm font-semibold text-foreground"}`}>{heading}</p>
            {rhythm !== "done" && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span className="font-medium uppercase tracking-wider">{category}</span>
                {countLabel && <span className="tabular-nums">· {countLabel}</span>}
                {progress && progress.total > 0 && <span data-progress-pill className="tabular-nums">· {progress.done}/{progress.total} done</span>}
                {link && <span>· Opens {link.label}</span>}
              </div>
            )}
            {rhythm === "done" && <span data-progress-pill className="sr-only">Done</span>}
            {rhythm !== "done" && progress && progress.total > 1 && (
              <div className="mt-2 flex gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(progress.total, 16) }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${i < Math.round(pct * Math.min(progress.total, 16)) ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            )}
          </div>
          {rhythm === "done"
            ? <span className="text-[11px] font-medium text-muted-foreground">Done</span>
            : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />}
        </div>
      </Button>

      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          data-pocket-page={id}
          data-locked={locked ? "1" : "0"}
          className={`fixed inset-0 z-50 flex h-[100dvh] flex-col animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none bg-background`}
        >
          <header data-pocket-header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground" aria-hidden><DomainGlyph domain={domain} className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{category}{progress && progress.total > 0 ? <span className="tabular-nums"> · {progress.done}/{progress.total} done</span> : null}</p><h2 className="break-words text-base font-bold leading-tight text-foreground">{heading}</h2></div>
            {locked ? (
              <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="h-3 w-3" />Locked in</Badge>
            ) : (
              <Button size="sm" className="h-10 px-4 active:scale-95 transition-transform motion-reduce:transition-none" onClick={() => setLocked(true)}>Start</Button>
            )}
            {!locked && (
              <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Close" onClick={() => close(true)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            {showIntro && intro && (
              <div data-pocket-intro className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground animate-in fade-in motion-reduce:animate-none">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">First time here</p>
                <p className="mt-1 leading-snug">{intro}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={dismissIntro}>Got it</Button>
              </div>
            )}
            {link && (
              <div className="mb-3 rounded-lg border border-border p-3">
                <p className="text-sm font-semibold text-foreground">How to do it</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {link.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <Button className="mt-3 w-full" onClick={() => { close(true); onNavigate?.(link.route); }}>
                  <ExternalLink className="mr-1.5 h-4 w-4" />Open {link.label}
                </Button>
              </div>
            )}
            <PocketDetailsContext.Provider value={true}>{children({ pocket: true })}</PocketDetailsContext.Provider>
            {practiceLogging && <section className="mt-4 border-t border-border pt-3" data-card-practice>
              <h3 className="text-sm font-semibold text-foreground">Log your practice</h3>
              <ol className="my-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Finish the prescribed work. Do not repeat it to make a log.</li>
                <li>Choose team practice, lesson or own work.</li>
                <li>Enter the minutes you actually did and how hard it felt.</li>
                <li>Save once. Do not log the same practice again in another card.</li>
              </ol>
              <PracticeLog planDate={planDate} modality={category.toLowerCase()} />
            </section>}
            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground" data-card-disclaimer>
              {CARD_DISCLAIMER}
            </p>
            <div className="mt-2 flex justify-center"><ReportProblemButton className="h-7 text-[12px]" card={heading} planDate={planDate} /></div>
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Button variant="ghost" size="sm" className="h-11" onClick={() => setConfirmDiscard(true)}>
              Exit without saving
            </Button>
            <Button size="sm" className="h-11 px-5 font-semibold active:scale-95 transition-transform motion-reduce:transition-none" onClick={() => close(true)}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />Save &amp; Exit
            </Button>
          </footer>
          <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Exit without saving?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anything you haven't logged yet on this card will be dropped. Sets you already logged stay saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep working</AlertDialogCancel>
                <AlertDialogAction onClick={() => close(false)}>Exit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>,
        document.body,
      )}
    </>
  );
}
