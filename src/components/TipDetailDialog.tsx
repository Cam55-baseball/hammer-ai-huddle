import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Leaf, FlaskConical, Trophy } from 'lucide-react';
import type { CategoryTipDetails } from '@/hooks/useNutritionCategoryTips';

interface TipDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipText: string;
  categoryName?: string | null;
  details: CategoryTipDetails | null | undefined;
}

export function TipDetailDialog({ open, onOpenChange, tipText, categoryName, details }: TipDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          {categoryName && (
            <Badge variant="secondary" className="w-fit text-xs mb-2">{categoryName}</Badge>
          )}
          <DialogTitle className="text-base leading-snug text-left">
            {tipText}
          </DialogTitle>
        </DialogHeader>

        {details ? (
          <div className="space-y-4 mt-2">
            {details.mechanism && (
              <section className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Why it works
                </h4>
                <p className="text-sm leading-relaxed">{details.mechanism}</p>
              </section>
            )}

            {details.foodSources && details.foodSources.length > 0 && (
              <section className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Leaf className="h-3.5 w-3.5" />
                  Food & lifestyle sources
                </h4>
                <ul className="grid grid-cols-2 gap-1.5">
                  {details.foodSources.map((f, i) => (
                    <li key={i} className="text-sm px-2 py-1 rounded-md bg-muted/40 border border-border/40">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {details.athleteRelevance && (
              <section className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Why it matters for you
                </h4>
                <p className="text-sm leading-relaxed">{details.athleteRelevance}</p>
              </section>
            )}

            {details.safetyNote && (
              <section className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{details.safetyNote}</p>
              </section>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic mt-2">
            Educational tip. Always consult a qualified professional before changing your diet or health routine.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
