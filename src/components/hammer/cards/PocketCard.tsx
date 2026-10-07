/**
 * PocketCard — Round 8 Step 1 card shell (screen only; never changes the plan).
 *
 * On the plan, a card shows as a tile with a clear heading. Tapping opens a
 * full "pocket page". "Start" locks in: the page covers everything else and
 * only the card scrolls. Every opened card ends with Save & Exit, Exit without
 * saving (confirmed) and the owner's disclaimer. The open card is remembered
 * on this device for the plan date, so a reload or app close reopens it.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Lock, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const CARD_DISCLAIMER =
  "Hammer's Modality is not responsible for any injury that may occur during exercises. There are no guarantees in results. Always consult with a qualified healthcare professional before beginning any exercise program. Listen to your body and stop immediately if you experience pain.";

const OPEN_KEY = "hm_pocket_open";

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
}

export function PocketCard({ id, category, focus, tone, planDate, prescribed, countLabel, notPrescribedNote, children }: Props) {
  const [open, setOpen] = useState(() => prescribed && readOpenPocket(planDate) === id);
  const [locked, setLocked] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const heading = focus ? `${category} — ${focus}` : category;

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
  }
  function close(saved: boolean) {
    setOpen(false);
    setLocked(false);
    writeOpenPocket(null, planDate);
    if (saved) toast.success("Saved. Your logged work is kept.");
  }

  return (
    <>
      <button
        type="button"
        onClick={openPocket}
        disabled={!prescribed}
        data-pocket-tile={id}
        className="group w-full rounded-xl border border-border bg-card p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:cursor-default disabled:opacity-70 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
      >
        <div className="flex items-center gap-3">
          <span className={`h-10 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`text-[10px] ${tone} text-primary-foreground border-0`}>{category}</Badge>
              {countLabel && prescribed && <span className="text-[11px] text-muted-foreground">{countLabel}</span>}
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{heading}</p>
            {!prescribed && (
              <p className="text-[11px] text-muted-foreground">{notPrescribedNote ?? "Not on today's plan."}</p>
            )}
          </div>
          {prescribed && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          data-pocket-page={id}
          data-locked={locked ? "1" : "0"}
          className={`fixed inset-0 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none ${locked ? "bg-background" : "bg-background/98"}`}
        >
          <header className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className={`h-6 w-1.5 rounded-full ${tone}`} aria-hidden />
            <h2 className="min-w-0 flex-1 text-base font-semibold leading-tight text-foreground">{heading}</h2>
            {locked ? (
              <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="h-3 w-3" />Locked in</Badge>
            ) : (
              <Button size="sm" onClick={() => setLocked(true)}>Start</Button>
            )}
            {!locked && (
              <Button size="icon" variant="ghost" aria-label="Close" onClick={() => close(true)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            {children({ pocket: true })}
            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground" data-card-disclaimer>
              {CARD_DISCLAIMER}
            </p>
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)}>
              Exit without saving
            </Button>
            <Button size="sm" onClick={() => close(true)}>
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
        </div>
      )}
    </>
  );
}
