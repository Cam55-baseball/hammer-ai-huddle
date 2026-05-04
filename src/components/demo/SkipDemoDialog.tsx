import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}

// Two-step loss-framed skip dialog.
export function SkipDemoDialog({ open, onOpenChange, onConfirm }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleClose = (v: boolean) => {
    if (!v) setStep(1);
    onOpenChange(v);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Skip means choosing blind</AlertDialogTitle>
              <AlertDialogDescription>
                The demo is what tells you which tier actually fits you. Most athletes change
                their pick after seeing the previews. Sure you want to skip?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep exploring</AlertDialogCancel>
              <AlertDialogAction onClick={() => setStep(2)}>I'll skip anyway</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>We'll save your spot</AlertDialogTitle>
              <AlertDialogDescription>
                You can resume any time from the <strong>Resume Demo</strong> button at the top of the app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStep(1)}>Back</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onConfirm(); setStep(1); }}>
                Skip for now
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
