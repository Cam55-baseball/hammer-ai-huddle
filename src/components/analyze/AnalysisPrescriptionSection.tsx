/**
 * Analysis Prescription Section.
 *
 * Lives inside the analysis report so an athlete sees "here's your score, and
 * here's what to work on" in one place. Two sources, clearly separated:
 *   1. This clip — drills matched to what this analysis actually flagged.
 *   2. Your ongoing plan — the HIE `prescriptive_actions` output, relocated
 *      here from the Progress dashboard.
 *
 * Presentation only. No new intelligence, no re-scoring.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, ChevronRight, ArrowRight, Play } from "lucide-react";
import { useHIESnapshot } from "@/hooks/useHIESnapshot";
import { matchPrescriptionDrills, maintenanceDrills } from "@/lib/prescription/matchDrills";
import type { EliteDrill } from "@/data/drills/eliteDrillCatalog";

interface Props {
  module?: string | null;
  sport?: string | null;
  violations?: Record<string, boolean> | null;
  pieV2Signals?: string[];
}

function DrillRow({ drill, reasons }: { drill: EliteDrill; reasons?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-accent/20 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{drill.name}</div>
          <p className="text-xs text-muted-foreground">{drill.fixes}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] capitalize">{drill.level}</Badge>
            <Badge variant="outline" className="text-[10px]">{drill.dosage}</Badge>
            <Badge variant="outline" className="text-[10px]">{drill.subSkill}</Badge>
            {reasons?.slice(0, 2).map((r) => (
              <Badge key={r} variant="destructive" className="text-[10px] capitalize">
                fixes: {r}
              </Badge>
            ))}
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3 text-xs">
          <div>
            <span className="font-medium">Setup: </span>
            <span className="text-muted-foreground">{drill.setup}</span>
          </div>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            {drill.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1.5">
            {drill.cues.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px]">“{c}”</Badge>
            ))}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Equipment: </span>
            {drill.equipment.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalysisPrescriptionSection({ module, sport, violations, pieV2Signals }: Props) {
  const navigate = useNavigate();
  const { snapshot } = useHIESnapshot();

  const weaknessAreas = useMemo(
    () => (snapshot?.weakness_clusters ?? []).map((c: any) => c?.area ?? c?.metric ?? "").filter(Boolean),
    [snapshot],
  );

  const matches = useMemo(
    () =>
      matchPrescriptionDrills({
        violations,
        pieV2Signals,
        weaknessAreas,
        module,
        sport,
      }),
    [violations, pieV2Signals, weaknessAreas, module, sport],
  );

  const fallback = useMemo(
    () => (matches.length === 0 ? maintenanceDrills(module, sport) : []),
    [matches.length, module, sport],
  );

  const hieActions = snapshot?.prescriptive_actions ?? [];

  const startDrill = (drillModule: string, name: string, constraints?: string) => {
    const params = new URLSearchParams({
      drill_type: name,
      module: drillModule,
      constraints: constraints ?? "",
    });
    navigate(drillModule === "tex-vision" ? `/tex-vision?${params}` : `/practice?${params}`);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Your prescription
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          What to work on next, based on this analysis. Suggested — not mandatory.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {matches.length > 0 ? "From this clip" : "Maintenance work"}
          </h4>
          {matches.length > 0 ? (
            matches.map((m) => <DrillRow key={m.drill.id} drill={m.drill} reasons={m.reasons} />)
          ) : fallback.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Nothing was flagged on this clip. These keep the pattern sharp.
              </p>
              {fallback.map((d) => (
                <DrillRow key={d.id} drill={d} />
              ))}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No drill match for this module yet.
            </p>
          )}
        </section>

        {hieActions.length > 0 && (
          <section className="space-y-2 border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From your ongoing plan
            </h4>
            {hieActions.map((action, i) => (
              <div key={i} className="space-y-2">
                <div className="text-sm font-semibold text-primary">Fix: {action.weakness_area}</div>
                {action.drills.map((drill, j) => (
                  <div key={j} className="flex items-start gap-3 rounded-lg bg-accent/30 p-3">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{drill.name}</div>
                      <p className="text-xs text-muted-foreground">{drill.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {drill.constraints && (
                          <Badge variant="secondary" className="text-xs">{drill.constraints}</Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {drill.module.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1 text-xs"
                      onClick={() => startDrill(drill.module, drill.drill_type || drill.name, drill.constraints)}
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
