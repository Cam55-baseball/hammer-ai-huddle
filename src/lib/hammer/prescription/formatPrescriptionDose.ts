import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

const plural = (value: number, one: string, many = `${one}s`) => `${value} ${value === 1 ? one : many}`;

/** Display only: formats the persisted prescription without changing its dose. */
export function formatPrescriptionDose(rx: Pick<WkRx, "sets" | "reps" | "duration_seconds" | "distance_feet" | "total_reps" | "dosage_unit">): string {
  const unit = String(rx.dosage_unit ?? "reps").toLowerCase();
  const parts: string[] = [];
  const totalDoseUnit = ["innings", "contacts", "throws", "seconds", "feet"].includes(unit);
  const hasTotal = Boolean(rx.total_reps || rx.duration_seconds || rx.distance_feet);

  if (unit === "seconds" && rx.duration_seconds && (!rx.sets || rx.sets <= 1) && (!rx.reps || rx.reps <= 1)) {
    return rx.duration_seconds >= 60 && rx.duration_seconds % 60 === 0
      ? `${plural(rx.duration_seconds / 60, "minute")} total`
      : `${plural(rx.duration_seconds, "second")} total`;
  }

  if (rx.sets && rx.reps && !(totalDoseUnit && hasTotal)) {
    const repUnit = unit === "seconds" ? "second" : unit === "feet" ? "foot" : unit === "throws" ? "throw" : unit === "contacts" ? "contact" : "rep";
    parts.push(`${plural(rx.sets, "set")} × ${plural(rx.reps, repUnit, repUnit === "foot" ? "feet" : `${repUnit}s`)}`);
  } else if (rx.reps && !(totalDoseUnit && hasTotal)) {
    parts.push(plural(rx.reps, "rep"));
  }

  if (rx.distance_feet) parts.push(`${plural(rx.distance_feet, "foot", "feet")} per rep`);
  if (rx.duration_seconds && unit !== "seconds") parts.push(`${plural(rx.duration_seconds, "second")} per rep`);
  if (rx.total_reps && rx.total_reps !== rx.reps) {
    const totalUnit = unit === "throws" ? "throw" : unit === "contacts" ? "contact" : unit === "innings" ? "inning" : "rep";
    parts.push(`${plural(rx.total_reps, totalUnit)} total`);
  }
  return parts.join(" × ") || "Dose not available — ask Hammer before starting.";
}