import { useMemo } from "react";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import {
  boundedForecastWindow,
  hoursSinceLast,
} from "@/lib/digest/projections";

/**
 * Bounded forecast projections — continuation only.
 * No injury, psychological, scholarship, or performance prediction.
 */
export function useForecastProjection() {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 21, limit: 1500 });

  const projection = useMemo(() => {
    const r = rows ?? [];
    return {
      workloadContinuation: boundedForecastWindow(r, "athlete.schedule", 21),
      readinessContinuation: boundedForecastWindow(r, "athlete.readiness", 21),
      behavioralContinuation: boundedForecastWindow(r, "behavioral", 21),
      escalationPersistence: hoursSinceLast(r, "behavioral.escalation"),
      recoveryMissingness: hoursSinceLast(r, "athlete.recovery"),
      readinessMissingness: hoursSinceLast(r, "athlete.readiness"),
    };
  }, [rows]);

  return { projection, isLoading, rows: rows ?? [] };
}
