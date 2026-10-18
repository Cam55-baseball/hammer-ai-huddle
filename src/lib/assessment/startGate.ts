/** Existing starts are permanent; optional answers never control first start. */
export function assessmentStartAllowed(startedAt: string | null, completedAt: string | null): boolean {
  return !!startedAt || !!completedAt;
}