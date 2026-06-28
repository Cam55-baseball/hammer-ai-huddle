/**
 * ReadinessPanel — readiness, recovery, fatigue snapshot + correlations.
 */
import { useMemo } from "react";
import { ReadinessCard } from "@/components/hie/ReadinessCard";
import { ReadinessBreakdownCard } from "@/components/hie/ReadinessBreakdownCard";
import { AutoCorrelationCards } from "@/components/progress/correlations/AutoCorrelationCards";
import { CorrelationExplorer } from "@/components/progress/correlations/CorrelationExplorer";
import { buildTopicVariables } from "@/lib/progress/topicVariables";
import { pearson, type NumericPoint } from "@/lib/progress/correlations";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";

export function ReadinessPanel() {
  const { data: rows = [] } = useAthleteCommandRows({ days: 60, limit: 800 });
  const vars = useMemo(() => buildTopicVariables(rows, "readiness"), [rows]);

  const auto = useMemo(() => {
    const readiness = vars.find((v) => v.key === "readiness");
    const sleep = vars.find((v) => v.key === "sleep_hours");
    const fatigue = vars.find((v) => v.key === "fatigue");

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
        title: "Readiness vs. sleep",
        xLabel: "Sleep (h)",
        yLabel: "Readiness",
        result: pearson(join(sleep, readiness)),
      },
      {
        title: "Readiness vs. fatigue",
        xLabel: "Fatigue",
        yLabel: "Readiness",
        result: pearson(join(fatigue, readiness)),
      },
    ];
  }, [vars]);

  return (
    <div className="space-y-4">
      <ReadinessCard />
      <ReadinessBreakdownCard />
      <AutoCorrelationCards items={auto} />
      <CorrelationExplorer variables={vars} />
    </div>
  );
}
