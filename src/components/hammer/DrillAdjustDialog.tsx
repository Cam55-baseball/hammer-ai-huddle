/** Name-only legacy drills cannot authorize new work, equipment or dosage. */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PlanAdjustment } from "@/lib/hammer/prescription/drillSwap";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modality: string;
  drill: { name: string; slug?: string; dosage: string; equipmentNote?: string; setup?: string };
  onSave: (adj: PlanAdjustment) => Promise<void>;
}

export function DrillAdjustDialog({ open, onOpenChange, drill }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base break-words">Swap {drill.name}</DialogTitle>
          <DialogDescription className="text-sm">
            No checked replacement is available for this drill yet. Your original session is unchanged.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Don't do this drill if you're missing its gear or a safe place to do it.</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back to my session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}