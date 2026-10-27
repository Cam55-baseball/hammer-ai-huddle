import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { STEP_LABELS, previousAssessmentStep, type StepId, type StepState } from "@/lib/assessment/initialAssessment";

export function AssessmentMode({ open, onClose, step, steps, busy, error, onNavigate, onRecord, children }: {
  open: boolean; onClose: () => void; step: StepId; steps: Record<StepId, StepState>;
  busy: boolean; error: string | null; onNavigate: (step: StepId) => void;
  onRecord: (state: "done" | "skipped") => void; children: ReactNode;
}) {
  const done = Object.values(steps).filter(s => s === "done").length;
  const previous = previousAssessmentStep(step, steps);
  const content = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) content.current?.scrollTo({ top: 0 }); }, [step, open]);
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent aria-describedby="assessment-description" className="inset-0 left-0 top-0 z-50 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 [&>button]:hidden">
      <header className="shrink-0 border-b border-border bg-background px-5 pb-5 pt-[calc(1.25rem+var(--safe-top))] sm:px-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase text-primary">Assessment Mode</p><p className="mt-1 text-sm text-muted-foreground">Step {step} of 6 · {done} of 6 done</p></div>
          <Button variant="ghost" size="icon" aria-label="Close assessment" onClick={onClose}><X /></Button>
        </div>
        <div role="progressbar" aria-label="Assessment progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} className="mx-auto mt-5 grid max-w-3xl grid-cols-6 gap-2">
          {([1,2,3,4,5,6] as StepId[]).map(id => <Button key={id} variant="ghost" aria-label={`Step ${id}: ${STEP_LABELS[id]}`} disabled={busy || steps[id] === "locked"} onClick={() => onNavigate(id)} className={`h-2 min-w-0 rounded-sm p-0 ${steps[id] === "done" ? "bg-primary" : id === step ? "bg-foreground" : "bg-muted"}`} />)}
        </div>
      </header>
      <main ref={content} className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-7">
          <div><DialogTitle className="text-3xl font-semibold leading-tight sm:text-4xl">{STEP_LABELS[step]}</DialogTitle><DialogDescription id="assessment-description" className="mt-3 text-base">Your choice. Save what you know, or skip this step.</DialogDescription></div>
          {children}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </main>
      <footer className="shrink-0 border-t border-border bg-background px-5 pt-4 pb-[calc(1rem+var(--safe-bottom))] sm:px-10">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
          <Button variant="outline" disabled={busy || previous === null} onClick={() => { if (previous !== null) onNavigate(previous); }}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <Button variant="outline" disabled={busy} onClick={() => onRecord("skipped")}>Skip</Button>
          <Button disabled={busy} onClick={() => onRecord("done")}>{step === 6 ? "Save & exit" : "Next"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </footer>
    </DialogContent>
  </Dialog>;
}