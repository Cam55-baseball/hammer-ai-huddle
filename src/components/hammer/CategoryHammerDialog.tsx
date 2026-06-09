/**
 * CategoryHammerDialog — focused Coach Hammer surface for one report-card
 * category. Reuses the canonical HammerChat surface (single identity, one
 * memory per session) and passes a `categoryFocus` payload through to the
 * `hammer-chat` edge function so the system prompt stays scoped to the
 * category the athlete tapped.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HammerChat } from "./HammerChat";
import type { BhCategorySchema } from "@/lib/reportCard/v1/hittingV1Schema";

interface Props {
  readonly category: BhCategorySchema | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function CategoryHammerDialog({ category, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {category ? `Coach Hammer — ${category.name}` : "Coach Hammer"}
          </DialogTitle>
        </DialogHeader>
        {category && (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-medium">{category.whyItMatters}</p>
              <p className="mt-1 text-muted-foreground">{category.howToImprove}</p>
            </div>
            <HammerChat
              compact
              categoryFocus={{
                id: category.id,
                name: category.name,
                hierarchyRank: category.hierarchyRank,
                whyItMatters: category.whyItMatters,
                howToImprove: category.howToImprove,
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
