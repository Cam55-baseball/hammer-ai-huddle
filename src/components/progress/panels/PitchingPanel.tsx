/**
 * PitchingPanel — Release-1 trusted pitching metrics + correlations.
 * Side-aware: ambidextrous throwers get L / R / Both tabs that scope all
 * widgets to the selected side. Single-sided athletes never see the tabs.
 */
import { useMemo, useState } from "react";
import { UhrcAthleteSection } from "@/components/report-card/UhrcAthleteSection";
import { AutoCorrelationCards } from "@/components/progress/correlations/AutoCorrelationCards";
import { CorrelationExplorer } from "@/components/progress/correlations/CorrelationExplorer";
import { buildTopicVariables } from "@/lib/progress/topicVariables";
import { pearson, type NumericPoint } from "@/lib/progress/correlations";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { SideViewTabs, type SideViewMode } from "@/components/shared/SideViewTabs";
import { useSideContext } from "@/contexts/SideContext";

export function PitchingPanel() {
  const [sideView, setSideView] = useState<SideViewMode>("combined");
  const { shouldShowPicker } = useSideContext();
  const { data: rows = [] } = useAthleteCommandRows({ days: 60, limit: 800 });

  const vars = useMemo(() => buildTopicVariables(rows, "pitching"), [rows]);
  const auto = useMemo(() => {
    const tempo = vars.find((v) => v.key === "tempo_sec");
    const sleep = vars.find((v) => v.key === "sleep_hours");
    const readiness = vars.find((v) => v.key === "readiness");

    const join = (a?: typeof vars[number], b?: typeof vars[number]): NumericPoint[] => {
      if (!a || !b) return [];
      const out: NumericPoint[] = [];
      for (const [date, x] of a.series.entries()) {
        const y = b.series.get(date);
        if (typeof y === "number") out.push({ x, y, date });
      }
      return out;
    };

    return [
      {
        title: "Tempo vs. sleep",
        xLabel: "Sleep (h)",
        yLabel: "Tempo (s)",
        result: pearson(join(sleep, tempo)),
      },
      {
        title: "Tempo vs. readiness",
        xLabel: "Readiness",
        yLabel: "Tempo (s)",
        result: pearson(join(readiness, tempo)),
      },
    ];
  }, [vars]);

  return (
    <div className="space-y-4">
      {shouldShowPicker("throw") && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Throw side
          </span>
          <SideViewTabs value={sideView} onChange={setSideView} discipline="throw" />
        </div>
      )}
      <UhrcAthleteSection />
      <AutoCorrelationCards items={auto} />
      <CorrelationExplorer variables={vars} />
    </div>
  );
}
