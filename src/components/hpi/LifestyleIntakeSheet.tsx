import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { LifestyleIntakeBlock } from "./LifestyleIntakeBlock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

/** Inline lifestyle intake — replaces the standalone onboarding tab. */
export function LifestyleIntakeSheet({ open, onOpenChange, onSaved }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lifestyle & constitution</SheetTitle>
          <SheetDescription>
            30 seconds. Tunes your Human Performance Intelligence signal.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <LifestyleIntakeBlock hideIntro onChange={() => onSaved?.()} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
