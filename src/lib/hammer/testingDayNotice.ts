/**
 * Athlete-facing testing-day notice rule. Read-only: staff record verified
 * results; the athlete only sees that testing is scheduled today. A self
 * Vault entry never completes a staff testing day.
 */
export interface TestingDayRow {
  id: string;
  scheduled_for: string;
  status: string;
  tests: string[] | null;
}

export function testingDaysToday(rows: TestingDayRow[], today: string): TestingDayRow[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return [];
  return rows.filter(
    (r) => r.status === "scheduled" && r.scheduled_for === today && (r.tests ?? []).some((t) => t.trim()),
  );
}
