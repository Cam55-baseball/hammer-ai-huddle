/**
 * BhCategoryPanels — hitting analysis surface.
 *
 * Phase 45 — Release-1 Trust Lock: hitting is suppressed in its entirety
 * for Release-1 because every BH metric today is LLM-derived (no bat
 * detector, no swing-start / contact anchor, no calibration). The
 * trust-first principle established by Phase 43/44 forbids presenting
 * LLM heuristics as measurement.
 *
 * The panel renders a single notice card instead of category tiles.
 * Suppression is gated on `RELEASE1_HITTING_SUPPRESSED` so the original
 * category UI returns the moment BH measurement gaps close (see
 * .lovable/phase-45 §1 and Phase 44 §8 measurement-gap inventory).
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BH_V1_CATEGORIES,
  type BhCategorySchema,
} from "@/lib/reportCard/v1/hittingV1Schema";
import { CategoryPanel } from "./CategoryPanel";
import { CategoryHammerDialog } from "@/components/hammer/CategoryHammerDialog";
import { RELEASE1_HITTING_SUPPRESSED } from "@/lib/reportCard/release1";

export function BhCategoryPanels() {
  const [active, setActive] = useState<BhCategorySchema | null>(null);

  if (RELEASE1_HITTING_SUPPRESSED) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>Hitting Analysis</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              not yet released
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Hitting analysis is not yet released. Pitching analysis is available
            now. We're holding hitting back until we can measure bat path, swing
            timing, and contact directly from your video — not estimate them.
          </p>
        </CardContent>
      </Card>
    );
  }

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
