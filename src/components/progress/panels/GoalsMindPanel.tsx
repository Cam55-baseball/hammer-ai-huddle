/**
 * GoalsMindPanel — ranked category goals + mood/escalation signals.
 */
import { useMemo } from "react";
import { CategoryGoalsCard } from "@/components/settings/CategoryGoalsCard";
import { AutoCorrelationCards } from "@/components/progress/correlations/AutoCorrelationCards";
import { CorrelationExplorer } from "@/components/progress/correlations/CorrelationExplorer";
import { buildTopicVariables } from "@/lib/progress/topicVariables";
import { pearson, type NumericPoint } from "@/lib/progress/correlations";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";

export function GoalsMindPanel() {
  const { data: rows = [] } = useAthleteCommandRows({ days: 60, limit: 800 });
  const vars = useMemo(() => buildTopicVariables(rows, "goals"), [rows]);

  const auto = useMemo(() => {
    const mood = vars.find((v) => v.key === "mood");
    const progress = vars.find((v) => v.key === "goal_progress");

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
        title: "Mood vs. goal events",
        xLabel: "Goal events",
        yLabel: "Mood",
        result: pearson(join(progress, mood)),
      },
    ];
  }, [vars]);

  return (
    <div className="space-y-4">
      <CategoryGoalsCard />
      <AutoCorrelationCards items={auto} />
      <CorrelationExplorer variables={vars} />
    </div>
  );
}
