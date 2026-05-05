import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onYes: () => void;
  onNo: () => void;
}

export function CommitIntentDialog({ open, onOpenChange, onYes, onNo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Want your personalized plan built from this result?</DialogTitle>
          <DialogDescription className="text-xs">
            We'll use what you just surfaced to build a plan specific to your gap.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onYes} className="w-full gap-1.5">
            <Sparkles className="h-4 w-4" /> Yes — build my plan
          </Button>
          <Button variant="ghost" size="sm" onClick={onNo} className="w-full text-muted-foreground">
            Not yet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
