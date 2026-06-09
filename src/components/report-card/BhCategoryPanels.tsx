/**
 * BhCategoryPanels — renders the four ratified §5.1 BH categories
 * under the UHRC report card. Hosts the per-category Coach Hammer
 * dialog. Per-category numeric scores are not yet bound (visible
 * missingness for V1 per §3 Law 7); the panel surfaces full §17
 * schema content + Coach Hammer entry point.
 */
import { useState } from "react";
import {
  BH_V1_CATEGORIES,
  type BhCategorySchema,
} from "@/lib/reportCard/v1/hittingV1Schema";
import { CategoryPanel } from "./CategoryPanel";
import { CategoryHammerDialog } from "@/components/hammer/CategoryHammerDialog";

export function BhCategoryPanels() {
  const [active, setActive] = useState<BhCategorySchema | null>(null);

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Hitting — phase categories (§5.1 V1)
      </div>
      {BH_V1_CATEGORIES.map((c) => (
        <CategoryPanel key={c.id} category={c} onAskHammer={setActive} />
      ))}
      <CategoryHammerDialog
        category={active}
        open={active !== null}
        onOpenChange={(o) => {
          if (!o) setActive(null);
        }}
      />
    </div>
  );
}
