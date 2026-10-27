export interface SavedDay { plan_date: string; sport: string; payload: unknown }
/** Saved drill work only. No forecasts, generated days, inferred doses or completion. */
export function savedWeek(rows: readonly SavedDay[], sport: string, today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  const end = date.toISOString().slice(0, 10);
  const days = rows.filter(row => row.sport === sport && row.plan_date >= start && row.plan_date <= end).sort((a,b) => a.plan_date.localeCompare(b.plan_date)).map(row => {
    const payload = row.payload as { blocks?: Array<{ status?: string; title?: string; drills?: Array<{ name?: string; dosage?: string; bunt?: unknown }> }> } | null;
    return { date: row.plan_date, activities: (payload?.blocks ?? []).filter(block => block.status === 'ready').flatMap(block => (block.drills ?? []).filter(drill => drill.name && drill.dosage).map(drill => ({ category: drill.bunt ? 'Bunting' : block.title ?? 'Skill work', name: drill.name as string, dosage: drill.dosage as string }))) };
  });
  return { start, end, days };
}