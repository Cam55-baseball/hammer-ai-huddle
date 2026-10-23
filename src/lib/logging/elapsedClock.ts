/** Preserve two decimal places; clock precision is not a claim of camera measurement accuracy. */
export function elapsedHundredths(start: number, now: number): number {
  return Math.round(Math.max(0, now - start) / 10) / 100;
}

export function clockHundredths(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00.00";
  const hundredths = Math.max(0, Math.round(seconds * 100));
  const whole = Math.floor(hundredths / 100);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
}