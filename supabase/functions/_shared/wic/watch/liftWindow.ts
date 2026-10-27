/** Seven inclusive calendar dates ending today; future plans are not recent training. */
export function liftFrequencyWindow(dates: readonly string[], today: string) {
  const end = Date.parse(`${today}T12:00:00Z`);
  if (!Number.isFinite(end)) return { liftsLast7Days: 0, daysSinceLastLift: null };
  const legal = [...new Set(dates)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today && Number.isFinite(Date.parse(`${date}T12:00:00Z`))).sort();
  const last = legal[legal.length - 1];
  return {
    liftsLast7Days: legal.filter(date => end - Date.parse(`${date}T12:00:00Z`) < 7 * 86400000).length,
    daysSinceLastLift: last ? Math.floor((end - Date.parse(`${last}T12:00:00Z`)) / 86400000) : null,
  };
}