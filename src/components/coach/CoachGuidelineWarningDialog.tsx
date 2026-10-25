import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import type { CoachGuidelineWarning } from "../../../supabase/functions/_shared/coach/guidelineWarnings";

export function CoachGuidelineWarningDialog({ warnings, onOkay, onCancel }: {
  warnings: readonly CoachGuidelineWarning[]; onOkay: () => void; onCancel: () => void;
}) {
  return <AlertDialog open onOpenChange={open => { if (!open) onCancel(); }}>
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-lg" onEscapeKeyDown={onCancel}>
      <AlertDialogHeader>
        <AlertDialogTitle>Warning: check this workout</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-left">
            {warnings.map((warning, i) => <p key={`${warning.code}:${warning.date}:${i}`}>
              <span className="font-semibold">{warning.date}</span> — {warning.rule}
            </p>)}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel action</AlertDialogCancel>
        <AlertDialogAction onClick={onOkay}>Okay</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}