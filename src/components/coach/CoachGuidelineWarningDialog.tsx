import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { MIN_OVERRIDE_REASON, type CoachGuidelineWarning } from "../../../supabase/functions/_shared/coach/guidelineWarnings";

export function CoachGuidelineWarningDialog({ warnings, onOkay, onCancel }: {
  warnings: readonly CoachGuidelineWarning[]; onOkay: (reason: string) => void; onCancel: () => void;
}) {
  const needsReason = warnings.some(w => w.requires_reason);
  const [reason, setReason] = useState("");
  const reasonOk = reason.trim().length >= MIN_OVERRIDE_REASON;
  return <AlertDialog open onOpenChange={open => { if (!open) onCancel(); }}>
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-lg" onEscapeKeyDown={onCancel}>
      <AlertDialogHeader>
        <AlertDialogTitle>Warning: check this workout</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-left">
            {warnings.map((warning, i) => <p key={`${warning.code}:${warning.date}:${i}`}>
              <span className="font-semibold">{warning.date}</span> — {warning.rule}
            </p>)}
            {needsReason && <div className="space-y-1">
              <label htmlFor="override-reason" className="text-sm font-medium text-foreground">
                This player is under 18. Write a short reason — their parent will be notified.
              </label>
              <textarea
                id="override-reason"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why is this workout okay today?"
              />
            </div>}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel action</AlertDialogCancel>
        <AlertDialogAction disabled={needsReason && !reasonOk} onClick={() => onOkay(reason.trim())}>Okay</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
