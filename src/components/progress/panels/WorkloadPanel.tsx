/**
 * WorkloadPanel — schedule posture, load, upcoming events.
 */
import { useMemo } from "react";
import { LoadDashboard } from "@/components/elite-workout/intelligence/LoadDashboard";
import { AutoCorrelationCards } from "@/components/progress/correlations/AutoCorrelationCards";
import { CorrelationExplorer } from "@/components/progress/correlations/CorrelationExplorer";
import { buildTopicVariables } from "@/lib/progress/topicVariables";
import { pearson, type NumericPoint } from "@/lib/progress/correlations";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";

export function WorkloadPanel() {
  const { data: rows = [] } = useAthleteCommandRows({ days: 60, limit: 800 });
  const vars = useMemo(() => buildTopicVariables(rows, "workload"), [rows]);

  const auto = useMemo(() => {
    const sessions = vars.find((v) => v.key === "session_count");
    const fatigue = vars.find((v) => v.key === "fatigue");
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
        title: "Sessions vs. fatigue",
        xLabel: "Sessions/day",
        yLabel: "Fatigue",
        result: pearson(join(sessions, fatigue)),
      },
      {
        title: "Sessions vs. readiness",
        xLabel: "Sessions/day",
        yLabel: "Readiness",
        result: pearson(join(sessions, readiness)),
      },
    ];
  }, [vars]);

  return (
    <div className="space-y-4">
      <LoadDashboard />
      <AutoCorrelationCards items={auto} />
      <CorrelationExplorer variables={vars} />
    </div>
  );
}
