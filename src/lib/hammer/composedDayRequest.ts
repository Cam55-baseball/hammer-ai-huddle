/** All new athlete days use the existing server's atomic sport/physical save. */
export function composedDayRequest(planDate: string) {
  return { plan_date: planDate, compose_sport_day: true as const };
}