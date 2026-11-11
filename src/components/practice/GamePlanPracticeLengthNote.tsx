import { MissingPracticeLengthNote } from "@/components/practice/MissingPracticeLengthNote";
import { practiceLengthMissing } from "@/lib/practice/practiceLength";

/** The Game Plan task's saved-session fields (see useGamePlan scheduledSessionData). */
export interface GamePlanPracticeData {
  id: string;
  durationMinutes?: number | null;
  status?: string | null;
  sessionModule?: string | null;
  sessionType?: string | null;
  practiceKind?: string | null;
}

export function practiceRowFromGamePlan(d: GamePlanPracticeData) {
  return {
    id: d.id,
    duration_minutes: d.durationMinutes ?? null,
    status: d.status ?? null,
    session_module: d.sessionModule ?? null,
    session_type: d.sessionType ?? null,
    practice_kind: d.practiceKind ?? null,
  };
}

/** True when Today's list should show the missing-length line under this task. */
export function gamePlanPracticeNeedsLength(d: GamePlanPracticeData | null | undefined): boolean {
  return !!d && practiceLengthMissing(practiceRowFromGamePlan(d));
}

/**
 * Owner Nov 10: under a real practice on Today's list with no length entered (shared rule;
 * Baserunning IQ sessions and Travel/Other notes never get it). Never blocks anything.
 */
export function GamePlanPracticeLengthNote({ data, onSaved }: { data: GamePlanPracticeData; onSaved?: () => void }) {
  if (!gamePlanPracticeNeedsLength(data)) return null;
  return (
    <div className="px-3">
      <MissingPracticeLengthNote practice={practiceRowFromGamePlan(data)} onSaved={() => onSaved?.()} />
    </div>
  );
}
